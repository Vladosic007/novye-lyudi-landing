/* =========================================================================
   Vercel Serverless — статистика для админки (Upstash Redis, вход по паролю)
   POST /api/stats  { password }  →  { total, byRef[], recent[] }
   ENV: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (или KV_*), ADMIN_PASSWORD
   ========================================================================= */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    var body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};

    var password = String(body.password || '');
    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      res.status(401).json({ error: 'Неверный пароль' });
      return;
    }

    var URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    var TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    if (!URL || !TOKEN) { res.status(500).json({ error: 'База не настроена' }); return; }

    var r = await fetch(URL + '/pipeline', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['LLEN', 'signatures'],
        ['LRANGE', 'signatures', '0', '199'],
        ['HGETALL', 'refcounts']
      ])
    });
    if (!r.ok) { console.error('stats fetch', r.status, await r.text()); res.status(502).json({ error: 'Ошибка чтения' }); return; }
    var out = await r.json(); // [{result}, {result}, {result}]

    var total = Number((out[0] && out[0].result) || 0);

    var recent = ((out[1] && out[1].result) || []).map(function (s) {
      try { return JSON.parse(s); } catch (e) { return null; }
    }).filter(Boolean);

    var hg = (out[2] && out[2].result) || []; // [field, val, field, val, ...]
    var byRef = [];
    for (var i = 0; i < hg.length; i += 2) byRef.push({ ref: hg[i], count: Number(hg[i + 1]) });
    byRef.sort(function (a, b) { return b.count - a.count; });

    res.status(200).json({ total: total, byRef: byRef, recent: recent, sheetUrl: process.env.GOOGLE_SCRIPT_URL || '' });
  } catch (err) {
    console.error('stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
