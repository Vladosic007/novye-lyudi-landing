/* =========================================================================
   Vercel Serverless — приём заявок → Upstash Redis
   POST /api/submit  { name, phone, comment, consent, adult, ref, source }
   ENV (Vercel Marketplace → Upstash подставит сам):
     UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  (или KV_REST_API_URL / KV_REST_API_TOKEN)
   Пока переменных нет — заявка пишется в лог, чтобы сайт работал.
   ========================================================================= */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    var body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};

    // honeypot
    if (String(body.website || '').trim()) { res.status(200).json({ ok: true }); return; }

    var name = String(body.name || '').trim().slice(0, 200);
    var phone = String(body.phone || '').trim().slice(0, 30);
    var comment = String(body.comment || '').trim().slice(0, 2000);
    var source = String(body.source || '').trim().slice(0, 500);
    var ref = String(body.ref || '').trim().slice(0, 40);
    var consent = body.consent === true;
    var adult = body.adult === true;

    if (!name || phone.replace(/\D/g, '').length < 11) {
      res.status(400).json({ error: 'Проверьте имя и телефон' });
      return;
    }

    var record = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      created_at: new Date().toISOString(),
      name: name, phone: phone, comment: comment,
      consent: consent, adult: adult, ref: ref, source: source
    };
    var refKey = ref || '(без метки)';

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

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
