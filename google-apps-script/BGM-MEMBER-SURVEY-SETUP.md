# BGM Member Survey → Google Sheets setup

The website now includes a **Member Survey** door with only two required fields: name and WhatsApp number. The form is ready in the frontend, but Google Sheets submissions will not work until the endpoint is configured.

## One-time setup

1. Create a Google Sheet called **BGM Member Survey**. Keep sharing restricted to the organizers who need the responses.
2. Copy the spreadsheet ID from its URL. It is the text between `/d/` and `/edit`.
3. Open [Google Apps Script](https://script.google.com/) and create a new project.
4. Copy the contents of [`google-apps-script/bgm-member-survey.gs`](../google-apps-script/bgm-member-survey.gs) into the Apps Script editor.
5. Replace `PASTE_GOOGLE_SHEET_ID_HERE` with the spreadsheet ID from step 2. Save.
6. Choose **Deploy → New deployment → Web app**.
   - **Execute as:** Me
   - **Who has access:** Anyone
7. Deploy and authorize the script. Copy the Web app URL ending in `/exec`.
8. In `bgm-conversation-cards 3/index.html`, find:
   ```js
   const BGM_SURVEY_ENDPOINT = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL";
   ```
   Replace the placeholder with the Web app URL, keeping the quotation marks.
9. Commit the HTML change and let Vercel deploy it.
10. Test with your own name and WhatsApp number, then confirm a row appears in the **Survey Responses** tab.

## What is saved?

The sheet creates these columns: submission timestamp (UTC), name, WhatsApp number, and source. The form itself asks only for name and WhatsApp number. Do not make the spreadsheet public; anyone with access to it can see the collected phone numbers.

## Updating the endpoint later

If you create a new Apps Script deployment URL, update `BGM_SURVEY_ENDPOINT` and redeploy the site. If you change the script code, create a new version of the existing deployment.
