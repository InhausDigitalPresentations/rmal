# RMAL Content Credit Tracker

A single HTML file (`index.html`) that tracks usage against RMAL's content credit pool. Anyone with the link can tick/untick services as they're used, watch the remaining balance update, and see a full audit trail of who changed what and when.

## How it works

- **Reference Rate Card** — the agency rate and Rmal rate (20% off) for each service, pulled from the original spreadsheet.
- **Usage Log** — log a service used (with quantity, date, note). Each line has a checkbox: ticked = counted against the pool, unticked = excluded but kept on record.
- **Pool summary** — total credit, amount used, remaining balance, with a progress bar.
- **Change History** — an append-only log of every add / tick / untick / delete / pool edit, with who did it and when.
- **Shared data** — since GitHub Pages only serves static files, the data itself lives in a GitHub Gist (a small JSON file) that the page reads and writes to directly from the browser. That's what lets you and the client see the same live numbers.

## One-time setup

### 1. Create the data store (a Gist)

1. Go to [gist.github.com](https://gist.github.com) (log in first).
2. Create a **secret** gist with filename `rmal-content-pool-data.json` and this content:
   ```json
   {}
   ```
3. Save it, then copy the **Gist ID** from the URL — it's the long string after your username, e.g. `gist.github.com/yourname/3b1f9c...` → the ID is `3b1f9c...`.

### 2. Create a token

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**.
2. Generate a new token with only the **`gist`** scope checked.
3. Copy it (you won't see it again).

⚠️ **Important:** this token grants write access to *all* gists on that GitHub account, not just this one — GitHub doesn't support scoping a classic token to a single gist. Since both you and the client will need this token to tick/untick items, consider creating a **separate, dedicated GitHub account** just to host this tracker's data, rather than using your personal account. That way the shared token can't touch anything else.

### 3. Publish the page

1. Create a new GitHub repo (public is fine — the page itself has no sensitive data, the token is never stored in the repo).
2. Upload `index.html` to it.
3. Go to **Settings → Pages**, set source to the branch/root, save.
4. Your tracker will be live at `https://yourusername.github.io/reponame/`.

### 4. Connect the page

1. Open the published page.
2. Click the status pill (top right) to open **Settings & Sharing**.
3. Enter your name, the Gist ID, the token, and confirm the pool total (defaults to $44,600, per the current workbook).
4. Click **Save & Connect**.
5. Send the same link to the client. They open Settings once, enter their own name + the same Gist ID + the same token, and they're connected too.

The token and Gist ID are stored only in each person's own browser (`localStorage`) — never in the page's code or the repo.

## Day-to-day use

- To log something used: pick the service (or "Other / custom item…"), set quantity/date/note, click **+ Log usage**. It's ticked by default.
- To dispute or remove a use: untick its checkbox in the Usage Log, or delete the row entirely (it still stays visible in the History section either way).
- The page auto-syncs ~20 seconds after any change, and polls for updates from the other person every 20 seconds. There's also a **Sync now** button in Settings for an immediate refresh.
- If two people edit at nearly the same moment, the app merges both sets of changes (log entries and history are combined, not overwritten) rather than one person's edits silently disappearing.

## Notes / limitations

- No login system — anyone with the link *and* the token can edit. Treat the link as you would any shared internal tool.
- Without a Gist ID configured, the page still works but only saves to that one browser (useful for a quick local test, not for sharing).
- GitHub's API allows ~5,000 authenticated requests/hour, far more than this tool will ever use.
