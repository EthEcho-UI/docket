# Docket: project handoff

Read this first when you continue the project in a new conversation. It records what exists, how it is built, what the user wants, and what is still open.

**To continue in a new chat:** give the assistant this file (or its link, https://github.com/EthEcho-UI/docket/blob/main/HANDOFF.md) and say what you want next. If the assistant runs on the user's server (Claude Code), the full project also lives in `~/Documents/AgentWorkspace/projects/kanban-todo-app/`.

_Last updated: 2026-10-06 (push server live, AI assistant added)._

---

## 1. What Docket is

A phone-first, Trello-style to-do app built as an installable web app (PWA). It also works on a PC (install from Chrome or Edge).

- **Live:** https://ethecho-ui.github.io/docket/ (the account root https://ethecho-ui.github.io/ redirects there)
- **Code (public):** https://github.com/EthEcho-UI/docket (GitHub Pages serves the `main` branch root)
- **User data (private):** https://github.com/EthEcho-UI/docket-data (only `docket-data.json`, written by the app)
- **Owner:** GitHub user `EthEcho-UI`. The user writes English (sometimes Czech), tests on Android Chrome and also uses a laptop.

## 2. Features (current)

- **Boards ("categories")** as tabs; **lists (columns)** with **cards**. Long-press to drag cards, columns and tabs on touch; mouse drag on PC. Columns collapse into a thin strip. Swipe sideways on a column to scroll the board.
- **Cards:** title, notes, checklist, **tags** (24 premade in groups Priority/Status/Type/Effort/Area plus "Your labels"; managed in Settings → Tags), **priority** (Low/Medium/High/Urgent), **pin** (star, always top), **due date + optional time**, time tracking, job override, copy to any list on any board, move via the list picker.
- **Column options:** sort manually, by priority or by due date; mark as the Done column; copy or move to another board; clear completed.
- **Done handling:** ticking a card moves it to the top of the board's Done column (named Done/Hotovo/Completed/Finished, marked as Done, or created); unticking returns it to where it came from. Setting: "Move finished cards to Done".
- **Calendar** (top-bar calendar icon, key C on PC): month grid; due cards show on their date; **events** like Google Calendar (all-day or timed, multi-day, repeat daily/weekly/monthly/yearly, colour, reminder, notes); add tasks from the calendar onto any board; tick tasks there.
- **Timer panel** (top-bar stopwatch, key T): **Focus** (pomodoro ring, link to card or job), **Hours** (pick job; add a task to start now or with + for later; tasks with ▶ to continue; link a task to a card; add past time, including **with no date** as a plain duration; period totals; export), **Stats** (week/month/year, tiles, hours-per-day chart stacked by job, earnings trend, by-job table, top tasks).
- **Jobs** (Settings → Jobs): name, colour, hourly rate + currency, linked boards. Earnings count up live while a timer runs.
- **Export:** Excel via ExcelJS (Summary: hours per task per job with totals; Details: one sheet per job, grouped by day, undated time in a "No specific date" section) or CSV.
- **Notifications:** pomodoro end, due time / morning-of-due, event reminders, one-off reminders (Settings → Notifications → "One-off reminders"). The panel shows a **status check** with a Fix button.
- **Look:** 34 themes in groups (Classic, Bold, Cozy, Pastel incl. Catppuccin and Rosé Pine, Editor incl. Nord/Dracula/Gruvbox/Solarized, Monochrome incl. Ink/Noir/Manga, Illustrated), plus an **accent colour** picker (10 presets or custom). Default accent is blue.
- **Haptics** (Settings → Haptics): on/off and Light/Medium/Strong. They only work in Chrome on Android, not in iOS or Safari.
- **Sync:** data always lives in the browser (localStorage key `docket.v1`). Optional **GitHub sync** (Settings → GitHub sync: per-device fine-grained token, repo `EthEcho-UI/docket-data`, Contents read+write) and optional **sync folder** (File System Access API). Backup/restore as a JSON file.
- **AI assistant:** chat that creates and edits cards, lists and events and sets reminders (OpenRouter or Gemini, your own key).
- **Installable:** manifest, icons (grey and white ticket with a check), offline app shell, home-screen shortcuts (#focus, #hours), Android back button closes the top panel.

## 3. Architecture

Everything is plain HTML/CSS/JS, with no build step.

| Path (in this repo) | What it is |
|---|---|
| `index.html` | The whole app: CSS tokens and themes, then one script in sections (`/* ===== section ===== */`): constants, themes, state/normalize, time tracking, pomodoro, sound/notifications, push reminders, haptics, rendering, actions, events, drag and drop, sheets, menus, backup, sync folder, GitHub sync, time panel (focus/hours/stats), task/entry/job editors, calendar, copy, export, tags, card detail, toast, installable app, boot. |
| `sw.js` | Service worker: caches the shell (`VERSION` constant, bump it when icons/manifest change), network-first page, cached fonts/ExcelJS, push handling (pushes are empty; it fetches text from the push server's `/pending`), notification click, `pushsubscriptionchange`. |
| `manifest.webmanifest`, `icons/` | PWA metadata and icons (generated with Pillow; ticket design). |

**Data model** (`state`, saved as JSON; `normalize()` upgrades older data):
`categories[] {id,name,color,jobId?,lists[] {id,title,collapsed,isDone,sort,cards[] {id,title,desc,done,tags[],due,dueTime,priority 0-4,pinned,checklist[],jobId?,fromList?,created}}}`,
`tags[] {id,name,color,group}`, `jobs[] {id,name,color,rate,currency}`, `entries[] {id,jobId,cardId,title,start,end|null,note,undated?}`, `wtasks[]` (work tasks added without time), `events[] {id,title,date,endDate,allDay,start,end,color,notes,repeat,remind}`, `reminders[] {id,at,title,body}`, `pomo`, `pomoRun`, `settings {theme,accent,hideDone,autoMoveDone,notify,notifyPrefs,haptics,workJob,workPeriod}`, `savedAt`, `active`.
Device-only (never synced): GitHub token in localStorage `docket.github`; sync-folder handle in IndexedDB `docket`.

**Sync rule:** newest `savedAt` wins (whole-document last-writer-wins). GitHub sync writes 4 s after a change (and when the app is hidden), and pulls on start, on return to the app and every 30 s. Every save is a commit in `docket-data`, so earlier versions can be restored from git history.

**Reminders:** `reminderItems()` builds the next 45 days of reminders. They are sent to the push server (`POST /sync`) whenever they change, and also fired locally by `scheduleLocal()` while the app is open (same notification tags, so duplicates replace each other).

## 4. Push server (Cloudflare Worker): live at https://docket-push.ethecho-ui.workers.dev

Source: `projects/kanban-todo-app/output/push-worker/` on the user's machine (not in this repo).
- One SQLite-backed Durable Object per push subscription stores the schedule and sets an **alarm** for the next reminder. When it fires, it sends an **empty VAPID-signed push**; the service worker then fetches the text from `/pending`.
- Endpoints: `/sync`, `/pending`, `/test`, `/unsubscribe`, `/move` (subscription renewal), `/export`.
- VAPID public key is in `index.html` (`VAPID_PUBLIC`) and `wrangler.jsonc`. The **private key is only in `projects/kanban-todo-app/secrets/vapid.json`** on the user's machine; it must be set as the Worker secret `VAPID_PRIVATE_JWK`.
- **Deployed 2026-10-06** to the Cloudflare account of zradicka.matyas2@gmail.com (workers.dev subdomain `ethecho-ui`). To redeploy, run `wrangler deploy` in `push-worker/`; the secret `VAPID_PRIVATE_JWK` is already set. `PUSH_SERVER` in index.html and sw.js points at the Worker. Verified live: CORS limited to the app origin, /sync sets the alarm, the alarm fires on time, VAPID signing works.
- Free-plan facts checked 2026-10-05: SQLite Durable Objects and alarms are allowed on the free plan; 100k requests/day; 10 ms CPU per invocation.

## 5. How to work on it

- Edit `index.html` (and `sw.js` when needed), test, commit, `git push`. GitHub Pages rebuilds in about 30–60 s. The page is network-first, so users get updates on reload.
- Tests (on the user's machine): `projects/kanban-todo-app/tests/`. These are jsdom smoke tests per feature; see `tests/README.md`. Run them after every change; each prints `ERRORS []` when clean.
- Tools on the user's machine: `gh` (logged in as EthEcho-UI, git credential helper set), git. No system Node: use a Python venv with `nodejs-wheel-binaries`. Wrangler is installed in the assistant's scratch folder; reinstall with npm if missing.
- Project bookkeeping lives in `projects/kanban-todo-app/` (`README.md`, `logs.md`, `errors.md`, `progress.md`, `summary.md`) per the user's AgentWorkspace rules.

## 6. User preferences and decisions (keep these)

- Wants a polished, modern look, not "vibecoded"; tests on the phone first.
- Prefers **checkmarks** over toggle switches in menus.
- Time tools live in a **bottom sheet** opened from the header (Focus/Hours/Stats). A board-integrated "Work" tab was tried and **rejected**; don't bring it back.
- Jobs and tags are managed in Settings. Export: job and date in the sheet title, not repeated on every row.
- Icon: original grey and white ticket (not Trello-like).
- The user's old portfolio site was unused; the account root now redirects to Docket. A dead custom domain (`zradicka.portfolio.cz`) was removed from `EthEcho-UI.github.io` with the user's approval.

## 7. Known limits

- Sync is last-writer-wins for the whole document: simultaneous edits on two devices within a few seconds can drop one side's change. History is still in git.
- Vibration: Android Chrome only. Folder sync: Chromium browsers on https only.
- Background reminders need the push server (section 4) and notification permission; Android battery optimisation can delay them.

## 8. Next steps (in order)

1. Done: push server deployed. On each device, open Settings → Notifications and tap Turn on (or Fix) once so the device registers.
2. Done: **AI assistant** (sparkle button, key A; Settings → AI assistant). It works with OpenRouter or Gemini through their OpenAI-compatible `/chat/completions` endpoints (both allow browser calls, checked 2026-10-06). Each provider keeps its own key and chosen model on the device (`docket.ai`: provider, keys{}, models{}, custom instructions); model lists are fetched from the provider (OpenRouter: only tool-capable models, with prices) and cached for a day (`docket.aimodels`); chat history in `docket.aichat`. The system prompt (`aiSystemPrompt()`) is a full harness: role, how Docket works, current date/week dates/boards/tags/upcoming items/notification status, working rules, writing guidelines, limits, style, plus the user's own instructions. Tools: find_cards, get_card, create_card, update_card, create_list, create_event, list_events, set_reminder. It cannot delete anything. Each reply that changed data can be undone. Tested with a mocked model (`tests/smoke12.js`). **It has not been run against a real model with a real key yet, so the first real use is the real test.**
3. Possible later: per-field sync merge instead of last-writer-wins; week view in the calendar.
