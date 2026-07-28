/* =========================================================================
   Vercel Serverless — приём заявок → Upstash Redis (быстро, клиент ждёт это)
   Почта и Google-таблица уходят В ФОНЕ (waitUntil) — не задерживают ответ.
   POST /api/submit { type, name, surname, first_name, patronymic, birthdate,
                      phone, email, region, city, experience, comment,
                      consent, adult, ref, source }
   ENV: UPSTASH_REDIS_REST_URL/TOKEN (или KV_*), MAIL_USER, MAIL_PASS, MAIL_TO, GOOGLE_SCRIPT_URL
   ========================================================================= */

// Фоновая доработка после ответа клиенту (если пакет недоступен — деградируем мягко)
var waitUntil;
try { waitUntil = require('@vercel/functions').waitUntil; }
catch (e) { waitUntil = function () {}; }

function sendMail(rec) {
  var nodemailer = require('nodemailer');
  var tx = nodemailer.createTransport({
    host: 'smtp.mail.ru', port: 465, secure: true,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  });
  return tx.sendMail({
    from: 'Заявки с сайта <' + process.env.MAIL_USER + '>',
    to: process.env.MAIL_TO || process.env.MAIL_USER,
    subject: 'Новая заявка: ' + rec.type,
    text: 'Тип: ' + rec.type + '\nФИО / Имя: ' + rec.name +
          (rec.birthdate ? '\nДата рождения: ' + rec.birthdate : '') +
          '\nТелефон: ' + rec.phone +
          (rec.email ? '\nE-mail: ' + rec.email : '') +
          (rec.region ? '\nРегион: ' + rec.region : '') +
          (rec.city ? '\nГород: ' + rec.city : '') +
          (rec.experience ? '\nОпыт наблюдения: ' + rec.experience : '') +
          (rec.comment ? '\nКомментарий: ' + rec.comment : '') +
          '\nРеферал: ' + (rec.ref || '(без метки)') +
          '\nСогласие: ' + (rec.consent ? 'да' : 'нет') + ', 18+: ' + (rec.adult ? 'да' : 'нет') +
          '\nДата: ' + rec.created_at + '\nСтраница: ' + rec.source
  });
}

function postSheet(rec) {
  return fetch(process.env.GOOGLE_SCRIPT_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec)
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    var body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};

    if (String(body.website || '').trim()) { res.status(200).json({ ok: true }); return; } // honeypot

    var s = function (v, n) { return String(v == null ? '' : v).trim().slice(0, n || 200); };
    var type = s(body.type, 40) || 'подпись';
    var name = s(body.name, 200);
    var phone = s(body.phone, 30);
    var ref = s(body.ref, 40);

    if (!name || phone.replace(/\D/g, '').length < 11) {
      res.status(400).json({ error: 'Проверьте имя и телефон' });
      return;
    }

    if (type === 'наблюдатель') ref = 'avazov'; // заявки наблюдателей — за Рафаэлем Авазовым
    var refKey = ref || '(без метки)';

    var record = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      created_at: new Date().toISOString(),
      type: type, name: name,
      surname: s(body.surname, 100), first_name: s(body.first_name, 100), patronymic: s(body.patronymic, 100),
      birthdate: s(body.birthdate, 20), phone: phone, email: s(body.email, 150),
      region: s(body.region, 120), city: s(body.city, 120), experience: s(body.experience, 60),
      comment: s(body.comment, 2000), consent: body.consent === true, adult: body.adult === true,
      ref: ref, source: s(body.source, 500)
    };

    // 1) Быстрая запись в Upstash — ТОЛЬКО её ждёт клиент (источник правды для админки)
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

    // 2) Отвечаем клиенту СРАЗУ
    res.status(200).json({ ok: true });

    // 3) Почта + Google-таблица — в фоне, параллельно, не задерживают ответ
    var jobs = [];
    if (process.env.MAIL_USER && process.env.MAIL_PASS) jobs.push(sendMail(record).catch(function (e) { console.error('mail error:', e); }));
    if (process.env.GOOGLE_SCRIPT_URL) jobs.push(postSheet(record).catch(function (e) { console.error('sheet error:', e); }));
    if (jobs.length) waitUntil(Promise.allSettled(jobs));
  } catch (err) {
    console.error('submit error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Server error' });
  }
};
