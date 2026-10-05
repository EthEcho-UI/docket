# Docket: project handoff

Read this first when you continue the project in a new conversation. It records what exists, how it is built, what the user wants, and what is still open.

**To continue in a new chat:** give the assistant this file (or its link, https://github.com/EthEcho-UI/docket/blob/main/HANDOFF.md) and say what you want next. If the assistant runs on the user's server (Claude Code), the whole project also lives in `~/Documents/AgentWorkspace/projects/kanban-todo-app/` (code, push server, tests, logs, secrets).

_Last updated: 2026-10-06._

---

## 1. What Docket is

A phone-first, Trello-style to-do app with a calendar, focus timer, work-hours tracking and an AI assistant, built as an installable web app (PWA). It also works as a desktop web app (install from Chrome or Edge).

- **Live:** https://ethecho-ui.github.io/docket/ (the account root https://ethecho-ui.github.io/ redirects there)
- **Code (public):** https://github.com/EthEcho-UI/docket (GitHub Pages serves the `main` branch root)
- **User data (private):** https://github.com/EthEcho-UI/docket-data (only `docket-data.json`, written by the app's GitHub sync)
- **Push server:** https://docket-push.ethecho-ui.workers.dev (Cloudflare Worker; see section 5)
- **Owner:** GitHub user `EthEcho-UI`. The user writes English (sometimes Czech), tests mainly on Android Chrome and also uses a laptop.

### Accounts and where secrets live

| What | Where | Notes |
|---|---|---|
| GitHub | account `EthEcho-UI` | `gh` on the user's server is logged in (token in `~/.config/gh/hosts.yml`, plain text); git uses it via `gh auth setup-git`. |
| Cloudflare | account of zradicka.matyas2@gmail.com, workers.dev subdomain `ethecho-ui` | Wrangler OAuth login in `~/.config/.wrangler/config/default.toml` on the server. |
| VAPID key pair (push) | public key in `index.html` (`VAPID_PUBLIC`) and `push-worker/wrangler.jsonc`; **private key only** in `projects/kanban-todo-app/secrets/vapid.json` (server) and as the Worker secret `VAPID_PRIVATE_JWK` | Never commit the private key. |
| GitHub sync token | each device's browser (localStorage `docket.github`) | Fine-grained token, only repo `docket-data`, Contents read+write. |
| AI API keys | each device's browser (localStorage `docket.ai`) | The user's own OpenRouter and/or Gemini keys; never synced. |

## 2. Features

**Board**
- **Boards** (called categories in code) as tabs; **lists** (columns) with **cards**. Long-press to drag cards, lists and tabs on touch; mouse drag on desktop; a column can also be picked up from any empty part. Columns collapse into a thin strip. Swipe sideways on a column to scroll the board.
- **Cards:** title, notes, checklist, **tags**, **priority** (Low/Medium/High/Urgent, flag chip), **pin** (star, always on top), **due date + optional time**, **repeat**, time tracking, job override. Copy to any list on any board; move via the list picker in the card.
- **Tags:** 24 premade in groups Priority/Status/Type/Effort/Area plus "Your labels"; picker with search and create-on-Enter; Settings → Tags to rename, recolour, regroup or delete.
- **List options (⋯):** sort manually / by priority / by due date (pinned stay on top), mark as the Done column, copy or move to another board, clear completed, collapse, rename, delete.
- **Done:** ticking a card moves it to the top of its board's Done column (a list marked as Done, or named Done/Hotovo/Dokončeno/Completed/Finished; created if missing); unticking returns it to where it came from. Setting: "Move finished cards to Done". "Hide completed cards" setting too.
- **Repeating cards:** with a due date, a card can repeat every day, weekday, week, 2 weeks, month or year. Finishing it leaves the finished copy in Done and puts a fresh copy (checklist reset) with the next due date where it was; if finished late, the next one jumps to the next date that isn't in the past. Undo removes the copy.

**Calendar** (top-bar calendar button; key C on desktop)
- Month grid; due cards on their date (with time), future repeats of cards shown faded; tick cards off from the day list.
- **Events** like Google Calendar: all-day (optionally multi-day) or timed, colour, notes, reminder (none / at start / 5, 10, 30, 60 min / 1 day before), repeat (same options as cards) with optional "repeat until".
- Add tasks from the calendar onto any board/list, with due time, priority and repeat.

**Timer panel** (top-bar stopwatch; key T on desktop)
- **Focus:** pomodoro ring, link to a card or job (time is logged automatically), settings (lengths, auto-start, chime, notifications).
- **Hours:** pick a job; type a task and **Start** (or **+** to add it for later); tasks with ▶ to continue; link a work task to a card (the card's timer then counts there); add past time, also **with no specific date** as a plain duration; period totals with live earnings; export.
- **Stats:** week/month/year with ‹ ›; tiles (hours with change vs previous period, earned, days worked, per worked day); hours-per-day chart stacked by job; earnings trend; by-job table; top tasks. Charts use the dataviz skill's validated palette by job order (job label colours failed the colour-blind checks).
- **Jobs** (Settings → Jobs): name, colour, hourly rate and currency, linked boards. Earnings count up live while a timer runs.
- **Export:** Excel via ExcelJS. "Summary" has hours per task per job with totals; "Details" has one sheet per job, grouped by day, with undated time in a "No specific date" section. The job and dates go in the sheet titles. CSV is also available.

**Notifications** (Settings → Notifications)
- Pomodoro end; cards at their due time (or a morning time if they have no time); event reminders; one-off reminders, which can repeat with an optional end date.
- Status check (permission, push server, device registration, last schedule sync, next reminder) with a **Fix** button, and a test button.
- With the push server they arrive when Docket is closed. While Docket is open it also fires the next day's reminders itself as a backup.

**AI assistant** (✨ in the top bar on the phone; round ✨ button bottom-right on desktop; key A on desktop) — see section 4.

**Look and feel**
- 34 themes in groups (Classic, Bold, Cozy, Pastel incl. Catppuccin and Rosé Pine, Editor incl. Nord/Dracula/Gruvbox/Solarized, Monochrome incl. Ink/Noir/Manga, Illustrated) plus an **accent colour** (10 presets or any colour; default blue; button text colour picked by contrast).
- **Haptics** (Settings → Haptics): on/off, Light/Medium/Strong. Only works in Chrome on Android (not iOS, Safari, Firefox, or the preview iframe).
- Swipe down anywhere at the top of a panel (or from its header) to close it; Android back button closes the top panel.
- **Desktop layout** only when the screen is ≥ 900px wide **and** has a mouse or trackpad (`wide` matchMedia in JS, matching `@media (min-width:900px) and (hover:hover) and (pointer:fine)` in CSS), so phones of any size or rotation always keep the phone layout. On desktop: two-column card window, large Focus/Hours/Stats window with side-by-side columns, calendar with the day list beside the month, popover menus, docked assistant window, keyboard shortcuts N (new card), T (timer), C (calendar), A (assistant), Esc.

**Data and sync**
- Data always lives in the browser (localStorage `docket.v1`). Backup/restore as a JSON file.
- **GitHub sync** (Settings → GitHub sync): per-device fine-grained token for `EthEcho-UI/docket-data`; writes 4 s after a change and when the app is hidden; pulls on start, on return to the app and every 30 s. Public repositories are refused.
- **Sync folder** (File System Access API; Chromium on https only): saves after every change, loads when newer.
- Installable: manifest, icons (grey and white ticket with a check), offline app shell, home-screen shortcuts (#focus, #hours).

## 3. Architecture

Everything is plain HTML/CSS/JS with no build step and no framework.

| Path (repo `docket`) | What it is |
|---|---|
| `index.html` | The whole app. CSS tokens and themes, then one script in sections (`/* ===== name ===== */`): constants (incl. repeat engine `repeatHits`/`nextRepeat`, priority, tags), themes and accents, state + `normalize()` (upgrades all older data), time tracking, pomodoro, sound and notifications, push reminders (`reminderItems`, `scheduleLocal`, status check), haptics, rendering, actions (`setDone`, `moveForDone`, `spawnNext`), event delegation, drag and drop, sheets and menus (+ desktop column helper), backup, sync folder, GitHub sync, time panel (focus/hours/stats), task/entry/job editors, calendar and events, AI assistant, copy card, export, tags, card detail, toast, installable app, boot. `window.docketDebug` exposes read-only `reminderItems()` and `health()` for checks. |
| `sw.js` | Service worker: shell cache (`VERSION`; bump it when icons, manifest or sw.js change), network-first page, cached fonts and ExcelJS, push handling (pushes are empty; it fetches the text from the push server's `/pending`), notification click, `pushsubscriptionchange` (re-subscribes and calls `/move`). |
| `manifest.webmanifest`, `icons/` | PWA metadata and icons (generated with Pillow). |
| `HANDOFF.md` | This file. |

**Data model** (`state`, saved as JSON):
- `categories[] {id, name, color, jobId?, lists[]}`
- `lists[] {id, title, collapsed, isDone, sort, cards[]}`
- `cards[] {id, title, desc, done, tags[], due, dueTime, repeat, priority 0-4, pinned, checklist[], jobId?, fromList?, spawned?, repeatWas?, created}`
- `tags[] {id, name, color, group}`
- `jobs[] {id, name, color, rate, currency}`
- `entries[] {id, jobId, cardId, title, start, end|null, note, undated?}`
- `wtasks[]` (work tasks added without time)
- `events[] {id, title, date, endDate, allDay, start, end, color, notes, repeat, until, remind}`
- `reminders[] {id, at, title, body, repeat, until}`
- `pomo`, `pomoRun`, `settings {theme, accent, hideDone, autoMoveDone, notify, notifyPrefs, haptics, workJob, workPeriod}`, `savedAt`, `active`

Device-only (never synced): localStorage `docket.github` (sync token), `docket.ai` (provider, keys{}, models{}, custom instructions), `docket.aimodels` (model-list cache), `docket.aichat` (chat); IndexedDB `docket` (sync-folder handle).

**Sync rule:** newest `savedAt` wins for the whole document (last-writer-wins). Every GitHub save is a commit in `docket-data`, so any earlier version can be restored from its history.

**Reminders:** `reminderItems()` builds up to 100 reminders for the next 45 days (pomodoro, due cards, events, one-off and repeating reminders). They are sent to the push server (`POST /sync`) whenever they change, and fired locally by `scheduleLocal()` while the app is open (same tags, so duplicates replace each other).

## 4. AI assistant

- Works with **OpenRouter** or **Google Gemini** through their OpenAI-compatible `/chat/completions` endpoints. Both allow direct browser calls (checked 2026-10-06). The user brings their own keys.
- Settings → AI assistant: each provider keeps **its own key and chosen model**. The model is picked from a **drop-down** filled from the provider's live list (OpenRouter: only tool-capable models, with prices; grouped Recommended / Free / by company; filter box), cached for a day. There is also an optional "Your instructions" box.
- **Every time it is opened it starts a new chat.**
- **Harness** (`aiSystemPrompt()`): role; how Docket works; right now (local time, this week's dates, boards and lists, tags, the next 7 days, notification status); how to work; writing guidelines; limits; style; plus the user's own instructions. If it was opened from an item, a "What the user is working on" section with that item's full data comes first (`aiCtxPrompt()`).
- **Tools:** find_cards, get_card, create_card, update_card, create_list, create_event, get_event, update_event, list_events, set_reminder (all support repeats). It **cannot delete** anything. Up to 6 tool rounds per message. Every reply that changed data has **Undo**.
- **Ask AI from an item:** ✨ buttons in the card window, the event editor and the calendar day open it focused on that item (`aiChat.ctx`), with a "Working on …" bar and item-specific suggestions. On the phone, closing returns to the item.
- Tested with a mocked model (tests smoke12, 13, 16). **It has not been run against a real model with a real key yet, so the first real use is the real test.**

## 5. Push server (Cloudflare Worker)

Source: `projects/kanban-todo-app/output/push-worker/` on the user's server (not in the public repo).
- One SQLite-backed Durable Object per push subscription stores the schedule and sets an **alarm** for the next reminder. When it fires, it sends an **empty VAPID-signed push**; the service worker then fetches the text from `/pending`.
- Endpoints (POST, JSON with `endpoint`): `/sync`, `/pending`, `/test`, `/unsubscribe`, `/move` (subscription renewal), `/export`. `GET /` is a health check.
- Deployed 2026-10-06. Verified live: CORS limited to `https://ethecho-ui.github.io`, `/sync` sets the alarm, the alarm fired on time, VAPID signing works.
- Redeploy: `wrangler deploy` inside `push-worker/` (the secret is already set). Free plan (checked 2026-10-05): SQLite Durable Objects and alarms allowed, 100k requests/day, 10 ms CPU per invocation.
- Each device must turn notifications on once (Settings → Notifications → Turn on / Fix) to register.

## 6. How to work on it

- Edit `index.html` (and `sw.js` when needed), run the tests, commit, `git push`. GitHub Pages rebuilds in about 30–60 s; the page is network-first, so users get updates on reload (desktop: Ctrl+Shift+R if cached).
- **Roll back the app:** `git revert <commit>` and push. **Restore user data:** take an older `docket-data.json` from the `docket-data` repo history and restore it in the app (Settings → Restore from backup).
- **Tests:** `projects/kanban-todo-app/tests/` has jsdom smoke tests per feature (smoke5–16; table in `tests/README.md`). Each prints `ERRORS []` when clean. `smoke14` and `smoke16` take `phone|desktop`. Run all of them after every change.
- **Tooling on the server:** no system Node. Use a Python venv with `nodejs-wheel-binaries` (run npm as `node …/nodejs_wheel/lib/node_modules/npm/bin/npm-cli.js`), install `jsdom@24` and set `NODE_PATH` to that `node_modules`. `openpyxl` reads exported Excel files back. Reinstall Wrangler with npm if it's missing.
- jsdom cannot check layout, CSS cascade or touch feel. For media-query or "show only on X" CSS, check the rules statically, and ask the user to look on a real device (see the lesson in `system/canonical/LESSONS.md`).
- Project bookkeeping lives in `projects/kanban-todo-app/` (`README.md`, `logs.md`, `errors.md`, `progress.md`, `summary.md`), following the user's AgentWorkspace rules.

## 7. User preferences and decisions (keep these)

- Wants a polished, modern look, not "vibecoded"; tests on the phone first; **phone layout must not change** when desktop work is done.
- Prefers **checkmarks** over toggle switches in menus.
- Time tools live in a **bottom sheet** opened from the header (Focus/Hours/Stats). A board-integrated "Work" tab was tried and **rejected**; don't bring it back.
- Jobs and tags are managed in Settings. Export: job and dates in the sheet title, not repeated on every row.
- Icon: original grey and white ticket (not Trello-like). Default accent: blue.
- The assistant starts a new chat each time it is opened; on desktop it lives bottom-right.
- The user's old portfolio site was unused: the account root now redirects to Docket (old page in the `EthEcho-UI.github.io` history, commit `fbdc6e0`). The dead custom domain `zradicka.portfolio.cz` was removed with the user's approval.

## 8. Known limits

- Sync is last-writer-wins for the whole document: edits on two devices within a few seconds can drop one side's change (history is still in git).
- Vibration: Android Chrome only. Folder sync: Chromium browsers on https only. Notifications on iOS need the app installed to the home screen (not tested).
- Android battery optimisation can delay background reminders.
- Desktop visuals have only been checked by code review and static CSS checks, not in a real browser by the assistant.

## 9. Next steps

1. First real assistant run with a real key; fix anything the real model does differently from the mock.
2. Possible later: per-field sync merge instead of last-writer-wins; a week view in the calendar; deleting through the assistant with confirmation.
