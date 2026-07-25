/* =========================================================================
   Vercel Serverless Function — приём заявок из формы
   POST /api/submit  { name, phone, comment, source }
   ---------------------------------------------------------------------------
   Ф0 (сейчас): валидирует данные и возвращает успех (пишет в лог Vercel).
   Ф2 (дальше): здесь подключим запись строки в Google-таблицу.
                Инструкция по подключению — в README.md.
   ========================================================================= */

module.exports = async function handler(req, res) {
  // CORS/же-метод
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Тело может прийти строкой — подстрахуемся
    var body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    var name = String(body.name || '').trim();
    var phone = String(body.phone || '').trim();
    var comment = String(body.comment || '').trim().slice(0, 2000);
    var source = String(body.source || '').trim().slice(0, 500);
    var consent = body.consent === true;
    var adult = body.adult === true;

    // Валидация
    if (!name || phone.replace(/\D/g, '').length < 11) {
      res.status(400).json({ error: 'Проверьте имя и телефон' });
      return;
    }

    var row = {
      date: new Date().toISOString(),
      name: name,
      phone: phone,
      comment: comment,
      consent: consent ? 'да' : 'нет',
      adult: adult ? 'да' : 'нет',
      source: source
    };

    // ─── Ф2: запись в Google Sheets ───────────────────────────────────────
    // Раскомментируйте после настройки переменных окружения (см. README):
    //
    // const { google } = require('googleapis');
    // const auth = new google.auth.JWT(
    //   process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, null,
    //   (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    //   ['https://www.googleapis.com/auth/spreadsheets']
    // );
    // const sheets = google.sheets({ version: 'v4', auth });
    // await sheets.spreadsheets.values.append({
    //   spreadsheetId: process.env.GOOGLE_SHEET_ID,
    //   range: 'Лист1!A:G',
    //   valueInputOption: 'USER_ENTERED',
    //   requestBody: { values: [[row.date, row.name, row.phone, row.comment, row.consent, row.adult, row.source]] }
    // });
    // ──────────────────────────────────────────────────────────────────────

    console.log('Новая заявка:', row);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
