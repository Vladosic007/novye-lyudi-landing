/* =========================================================================
   Vercel Serverless — приём заявок → Upstash Redis + дублирование на почту
   POST /api/submit { type, name, surname, first_name, patronymic, birthdate,
                      phone, email, region, city, experience, comment,
                      consent, adult, ref, source }
   type: "подпись" | "наблюдатель" (наблюдатели закрепляются за Рафаэлем: ref=avazov)
   ENV: UPSTASH_REDIS_REST_URL/TOKEN (или KV_*), MAIL_USER, MAIL_PASS, MAIL_TO
   ========================================================================= */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    var body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};

    // honeypot
    if (String(body.website || '').trim()) { res.status(200).json({ ok: true }); return; }

    var s = function (v, n) { return String(v == null ? '' : v).trim().slice(0, n || 200); };
    var type = s(body.type, 40) || 'подпись';
    var name = s(body.name, 200);
    var surname = s(body.surname, 100);
    var first_name = s(body.first_name, 100);
    var patronymic = s(body.patronymic, 100);
    var birthdate = s(body.birthdate, 20);
    var phone = s(body.phone, 30);
    var email = s(body.email, 150);
    var region = s(body.region, 120);
    var city = s(body.city, 120);
    var experience = s(body.experience, 60);
    var comment = s(body.comment, 2000);
    var source = s(body.source, 500);
    var ref = s(body.ref, 40);
    var consent = body.consent === true;
    var adult = body.adult === true;

    if (!name || phone.replace(/\D/g, '').length < 11) {
      res.status(400).json({ error: 'Проверьте имя и телефон' });
      return;
    }

    // Заявки наблюдателей закреплены за Рафаэлем Авазовым
    if (type === 'наблюдатель') ref = 'avazov';
    var refKey = ref || '(без метки)';

    var record = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      created_at: new Date().toISOString(),
      type: type, name: name, surname: surname, first_name: first_name, patronymic: patronymic,
      birthdate: birthdate, phone: phone, email: email, region: region, city: city,
      experience: experience, comment: comment, consent: consent, adult: adult, ref: ref, source: source
    };

    var URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    var TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

    if (URL && TOKEN) {
      var r = await fetch(URL + '/pipeline', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify([
          ['LPUSH', 'signatures', JSON.stringify(record)],
          ['HINCRBY', 'refcounts', refKey, 1]
        ])
      });
      if (!r.ok) {
        console.error('Upstash write failed:', r.status, await r.text());
        res.status(502).json({ error: 'Ошибка сохранения' });
        return;
      }
    } else {
      console.log('Заявка (база не настроена):', record);
    }

    // Дублируем заявку на почту (ошибки почты не роняют заявку)
    if (process.env.MAIL_USER && process.env.MAIL_PASS) {
      try {
        var nodemailer = require('nodemailer');
        var tx = nodemailer.createTransport({
          host: 'smtp.mail.ru', port: 465, secure: true,
          auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
        });
        await tx.sendMail({
          from: 'Заявки с сайта <' + process.env.MAIL_USER + '>',
          to: process.env.MAIL_TO || process.env.MAIL_USER,
          subject: 'Новая заявка: ' + type,
          text: 'Тип: ' + type + '\nФИО / Имя: ' + name +
                (birthdate ? '\nДата рождения: ' + birthdate : '') +
                '\nТелефон: ' + phone +
                (email ? '\nE-mail: ' + email : '') +
                (region ? '\nРегион: ' + region : '') +
                (city ? '\nГород: ' + city : '') +
                (experience ? '\nОпыт наблюдения: ' + experience : '') +
                (comment ? '\nКомментарий: ' + comment : '') +
                '\nРеферал: ' + refKey +
                '\nСогласие: ' + (consent ? 'да' : 'нет') + ', 18+: ' + (adult ? 'да' : 'нет') +
                '\nДата: ' + record.created_at + '\nСтраница: ' + source
        });
      } catch (mailErr) { console.error('mail error:', mailErr); }
    }

    // Дублируем в Google-таблицу через Apps Script (отдельный лист на каждого реферала)
    if (process.env.GOOGLE_SCRIPT_URL) {
      try {
        await fetch(process.env.GOOGLE_SCRIPT_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record)
        });
      } catch (gErr) { console.error('sheets error:', gErr); }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
