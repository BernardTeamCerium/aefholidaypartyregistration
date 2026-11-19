# Send registrations to a Google Sheet

Each time someone registers, Netlify sends the answers to a small Google Apps Script attached to your sheet, and the script adds a row. It's free and doesn't need Zapier.

## 1. Set up the sheet and script
1. Create a new Google Sheet, for example "AEF Holiday Party Registrations".
2. Go to **Extensions → Apps Script**. Delete what's there and paste in everything from `Code.gs`.
3. Change `SECRET` near the top to a long random string, like `aef-party-7f3k29xq81mz`. Copy it; you'll need it in step 2.
4. Click **Save**.
5. Click **Deploy → New deployment**. Click the gear icon, choose **Web app**, and set:
   - **Execute as:** Me
   - **Who has access:** Anyone. Netlify needs this to reach the script; the secret blocks everyone else.
6. Click **Deploy** and approve the permissions prompt. Google may warn "Google hasn't verified this app": click **Advanced → Go to (project name)**. That's normal for your own script.
7. Copy the **Web app URL**. It ends in `/exec`.

## 2. Point Netlify at it
1. In Netlify, go to **Site configuration → Notifications → Emails and webhooks → Form submission notifications → Add notification → HTTP POST request**.
2. Set:
   - **Event:** New form submission
   - **URL to notify:** your Web app URL with `?token=` and your secret on the end, for example
     `https://script.google.com/macros/s/AKfy.../exec?token=aef-party-7f3k29xq81mz`
   - **Form:** `holiday-party-registration`
3. Click **Save**.

## 3. Test
Submit a registration on the live page. Within a few seconds, a **Registrations** tab with bold headers and your test row should appear in the sheet.

## Good to know
- **Registrations from before this setup** aren't added automatically. In Netlify, go to **Forms → holiday-party-registration**, download the CSV, and paste those rows in.
- **Total headcount:** the Party Size column is column O, so in any cell enter `=SUM(Registrations!O2:O)`.
- **If you edit the script later,** go to **Deploy → Manage deployments**, click the edit (pencil) icon, set **Version: New version**, and deploy. That keeps the same URL.
- **Netlify may show the webhook as failed** because Google answers with a redirect. The row is still added, and if Netlify retries, the script skips repeats using the Netlify Submission ID column.
