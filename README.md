# RMAL Content Credit Tracker

A single HTML file (`index.html`) that tracks usage against RMAL's content credit pool. Anyone with the link can tick/untick services as they're used, watch the remaining balance update, and see a full audit trail of who changed what and when.

Shared data lives in a Google Sheet, read and written through a small Apps Script "Web App." There's no per-user login or token — one shared link works for everyone.

## How it works

- **Reference Rate Card** — the agency rate and Rmal rate (20% off) for each service, pulled from the original spreadsheet.
- **Usage Log** — log a service used (with quantity, date, note). Each line has a checkbox: ticked = counted against the pool, unticked = excluded but kept on record.
- **Pool summary** — total credit, amount used, remaining balance, with a progress bar.
- **Change History** — an append-only log of every add / tick / untick / delete / pool edit, with who did it and when — pulled straight from the Sheet's History tab.
- **Google Sheet** — already created for you: [RMAL Content Pool Data](https://docs.google.com/spreadsheets/d/1ZaVtNROQ_saoVuriDX95o3A0Y9Crt9wau6UVR14cjyI/edit). The Apps Script below fills in its tabs (`Entries`, `History`, `Config`) automatically the first time it runs.

## One-time setup

### 1. Add the backend script to the Sheet

1. Open the [RMAL Content Pool Data](https://docs.google.com/spreadsheets/d/1ZaVtNROQ_saoVuriDX95o3A0Y9Crt9wau6UVR14cjyI/edit) sheet.
2. Go to **Extensions → Apps Script**.
3. Delete whatever is in the default `Code.gs` file, then paste in the contents of the `Code.gs` file from this folder.
4. Save (⌘S / Ctrl+S).

### 2. Deploy it as a Web App

1. In the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set **Execute as: Me**, and **Who has access: Anyone**.
4. Click **Deploy**. The first time, Google will ask you to authorize the script — approve it (it's only accessing this one sheet).
5. Copy the **Web app URL** it gives you (ends in `/exec`). This is the only link you need to configure the tracker — no token, no per-user setup.

If you ever edit the script, you'll need to create a **new deployment version** (Deploy → Manage deployments → edit → New version) for changes to take effect on the same URL.

### 3. (Optional) Add a shared passphrase

By default, anyone who has the Web App URL can read and write to it — there's no login. If you'd rather it not be wide open:

1. In the Apps Script editor, go to **Project Settings → Script Properties**.
2. Add a property named `APP_SECRET` with any passphrase as the value.
3. In the tracker's Settings panel, enter that same passphrase in "Shared passphrase."

Leave `APP_SECRET` unset if you don't need this — the tracker works fine without it.

### 4. Publish the page on GitHub

1. Create a new GitHub repo (public is fine — it holds no sensitive data).
2. Upload `index.html` to it.
3. Go to **Settings → Pages**, set the source to your branch/root, and save.
4. Your tracker will be live at `https://yourusername.github.io/reponame/`.

### 5. Connect the page

1. Open the published page.
2. Click the status pill (top right) to open **Settings & Sharing**.
3. Enter your name, paste the Web App URL from step 2 (and the passphrase, if you set one), and confirm the pool total (defaults to $44,600, per the current workbook).
4. Click **Save & Connect**.
5. Send the same link to the client — they open Settings once, enter their own name and the same Web App URL (and passphrase, if any), and they're connected. No token to hand over.

## Day-to-day use

- To log something used: pick the service (or "Other / custom item…"), set quantity/date/note, click **+ Log usage**. It's ticked by default.
- To dispute or remove a use: untick its checkbox in the Usage Log, or delete the row entirely (it still stays visible in the History section either way).
- The page pulls fresh data every ~15 seconds, and any change you make saves immediately. There's also a **Sync now** button in Settings for an instant refresh.
- Since the Google Sheet itself is the single source of truth (not each browser), there's no merge/conflict logic to worry about — every tick, untick, or new entry is applied straight to the Sheet the moment it happens.
- You (or anyone with edit access to the Sheet) can also open it directly in Google Sheets to eyeball the raw `Entries` and `History` tabs at any time.

## Notes / limitations

- No login system on the page itself — anyone with the link can edit unless you've set the optional passphrase. Treat the link like you would any shared internal tool.
- Without a Web App URL configured, the page still works but only saves to that one browser (useful for a quick local test, not for sharing).
- Apps Script Web Apps have generous quotas for a tool like this (tens of thousands of requests/day) — far more than normal use will ever hit.
- If you rename or restructure the sheet tabs manually, the script's `ensureSheets_()` helper will just recreate anything it can't find, so avoid renaming `Entries`, `History`, or `Config`.
