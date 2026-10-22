/**
 * BGM Member Survey → Google Sheets
 *
 * SETUP
 * 1. Create a Google Sheet named "BGM Member Survey".
 * 2. Copy the spreadsheet ID from its URL (between /d/ and /edit).
 * 3. Replace SPREADSHEET_ID below with that ID.
 * 4. In Extensions → Apps Script, paste this file's code.
 * 5. Deploy → New deployment → Web app.
 *    Execute as: Me
 *    Who has access: Anyone
 * 6. Copy the Web app URL ending in /exec and paste it into
 *    BGM_SURVEY_ENDPOINT in "bgm-conversation-cards 3/index.html".
 * 7. Redeploy the website on Vercel.
 *
 * The form sends only name and WhatsApp. Submitted-at and source are
 * recorded as administrative metadata. Keep the spreadsheet access restricted.
 */
const SPREADSHEET_ID = 'PASTE_GOOGLE_SHEET_ID_HERE';
const SHEET_NAME = 'Survey Responses';

function doPost(e) {
  try {
    if (!e || !e.parameter) {
      return jsonResponse({ ok: false, error: 'Missing form data.' });
    }

    const name = String(e.parameter.name || '').trim().slice(0, 100);
    const whatsapp = String(e.parameter.whatsapp || '').trim().slice(0, 30);
    const source = String(e.parameter.source || 'BGM Member Survey').trim().slice(0, 100);
    const submittedAt = String(e.parameter.submittedAt || new Date().toISOString()).slice(0, 50);

    if (!name || !whatsapp) {
      return jsonResponse({ ok: false, error: 'Name and WhatsApp are required.' });
    }
    if (SPREADSHEET_ID === 'PASTE_GOOGLE_SHEET_ID_HERE') {
      return jsonResponse({ ok: false, error: 'Configure SPREADSHEET_ID first.' });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      let sheet = spreadsheet.getSheetByName(SHEET_NAME);
      if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Submitted at (UTC)', 'Name', 'WhatsApp number', 'Source']);
        sheet.setFrozenRows(1);
      }

      // Prevent spreadsheet formula injection from user-submitted text.
      const safeName = name.replace(/^[=+@]/, "'$&");
      const safePhone = whatsapp.replace(/^[=+@]/, "'$&");
      sheet.appendRow([submittedAt, safeName, safePhone, source]);
    } finally {
      lock.releaseLock();
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message || error) });
  }
}

function doGet() {
  return jsonResponse({ ok: true, service: 'BGM Member Survey endpoint' });
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
