# Docket: project handoff

Read this first when you continue the project in a new conversation. It records what exists, how it is built, what the user wants, and what is still open.

**To continue in a new chat:** give the assistant this file (or its link, https://github.com/EthEcho-UI/docket/blob/main/HANDOFF.md) and say what you want next. If the assistant runs on the user's server (Claude Code), the whole project also lives in `~/Documents/AgentWorkspace/projects/kanban-todo-app/` (code, push server, tests, logs, secrets).

_Last updated: 2026-10-18 (weekly board dates + due-date auto-sync, B36)._

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
- **Boards** (called categories in code) as tabs; each board is a **single column** - one ordered sequence of **cards** and **dividers**, top to bottom (as of B33, 2026-10-18; boards used to have multiple **lists**/columns - that whole concept is gone, see §3 for the migration). Long-press to drag cards and dividers on touch; mouse drag on desktop. Dragging a card and holding it over a *different* board's tab (~350ms, tab highlights/pulses while held) moves the card onto that board's sequence (appended at the end); a quick pass-through doesn't trigger it. Dragging a divider reorders only the divider itself (it never carries cards with it); dragging a card freely crosses divider boundaries - confirmed solid both directions, touch and mouse, in a real-browser pass (B35).
- **Dividers (blocks):** a labeled section heading inside a board's column (e.g. a weekday name, or a free-text heading like "Waiting on") that also acts as a "block" you can add tasks straight into. Not a card - no checklist/due/tags, doesn't count toward a board's open-card count, isn't a valid drop target for the cross-board tab-hold move. Add one via the board's ⋯ menu ("Add divider", B35: a sheet of presets - favorites first - plus "Custom label…" for a one-off, or "New preset…" to save a new reusable one) or apply a whole **board preset** (below). Tap a divider's label to rename it inline. Its own "⋯" opens **Rename / recolor (B35) / Save as preset… / Delete**; a divider's **color** (one of the app's 6 label colors, optional) shows as a dot by its label plus a left-border accent. Each divider's own **"+ Add task"** control (B35) inserts a new card right at the end of that divider's section instead of the board's very end; the board's original bottom "Add card" still appends to the very end, unchanged. Deleting a divider ("⋯ → Delete") doesn't delete the cards under it - those merge into the preceding section.
- **Board presets (B35):** ready-made divider layouts. Built-in: Workweek (Mon–Fri), Full week (Mon–Sun), Weekend (Sat–Sun), Triage (Today/Tomorrow/This week/Later), Time of day (Morning/Afternoon/Evening) - weekday names reuse the exact same strings as the per-divider weekday presets. Offered when creating a new board (start blank, or from any preset - seeds just the dividers, no cards) and from an existing board's ⋯ menu ("Apply board preset…" - **additive only**: appends only the dividers whose label doesn't already exist on that board, case-insensitive; never touches or duplicates what's already there - a deliberate safe default, see the B35 report for the alternative considered). "Save as preset…" on a board's ⋯ menu captures its current dividers (label + order) as a new reusable preset.
- **Favorites + custom presets (B35):** both preset systems (divider and board) support starring any preset (built-in or user-made) - favorites sort to the top of their picker, persisted in synced state. Either picker's "New preset…" builds one from scratch and saves it permanently (not a one-off); a divider's "Save as preset…" and a board's "Save as preset…" both capture the existing thing ("create from current") as a new preset.
- **Cards:** title, notes, checklist, **tags**, **priority** (Low/Medium/High/Urgent, flag chip), **pin** (star, always on top), **due date + optional time**, **repeat**, time tracking, job override. Copy or move to any board (no list sub-picker any more - a board is one sequence, so a copy/move just appends).
- **Tags:** 24 premade in groups Priority/Status/Type/Effort/Area plus "Your labels"; picker with search and create-on-Enter; Settings → Tags to rename, recolour, regroup or delete.
- **Board options (⋯)**, replacing the old per-list menu: rename, colour, add divider, apply/save board preset (B35), weekly reset (B35, below), paste card, job for time tracking, **sort** manually / by priority / by due date (pinned stay on top; now one setting for the whole board, not per list), **hide completed cards** (board-level override of the global default), clear completed, move left/right, delete.
- **Weekly auto-reset (B35):** each board can have a reset day (none, or Monday-Sunday) and a "Carry unfinished forward" toggle (default off), set from the board's ⋯ menu. Checked on boot and on `visibilitychange` (same pattern as the repeat engine's day-rollover). When a board's reset day is today and it hasn't reset yet this week (tracked via `lastResetAt`, re-entrancy-guarded against boot/visibilitychange racing), it resets: every done card is deleted outright; every not-done card is deleted too unless carry-forward is on, in which case all of them are swept into a single "⚠ Missed" divider (red/warning color) pinned to the very top - an ordinary divider from then on (renamable, recolorable, deletable). A reset never creates a second "Missed" divider across weeks - a leftover one is found and reused/folded into rather than stacked. Every other divider survives a reset untouched; only cards are ever removed.
- **Weekly board dates + due-date auto-sync (B36):** a **"weekly board"** is any board with a reset day set (`resetDay != null`, above - a board without one is completely unaffected by this). On a weekly board, any divider whose label is an exact match for a `WEEKDAY_NAMES` entry ('Monday'…'Sunday') shows that day's real calendar date for **the current Monday-Sunday week** next to its label (e.g. "Monday · Oct 20") - computed fresh at render time (`currentWeekDates()`), never stored, so it's always correct and rolls over naturally at midnight Monday regardless of what day the board's own reset actually fires on. A card added straight into a weekday divider's section (its own "+ Add task"), or dragged so it ends up under one (drag-and-drop within the board), has its `due` set to that divider's date for the current week, flagged `card.dueFromDivider = true` so it's tracked separately from a due date the user set deliberately. Moving an auto-dated card out from under any weekday divider on a weekly board - to a non-weekday divider, above the first divider, to a different board entirely, or swept into "⚠ Missed" by a carry-forward reset - clears `due`/`dueFromDivider` again, but **only** while that flag is still true; the moment a user edits a card's due date through the card editor (or the AI assistant's `update_card`), the flag clears and this auto-clearing logic leaves that card alone from then on. `dueTime` is never touched by any of this.
- **Done ("Completed"):** ticking a card never moves it in storage - it just stops rendering in its normal spot and, at render time, sinks into a fixed, non-removable "Completed" section at the very bottom of the board, most-recently-finished first. Unticking returns it to render in its exact original spot - there is nothing to "move back", since it never left. The old "mark as the Done list" concept and the global "Move finished cards to Done" setting are gone (auto-sink is unconditional now); "Hide completed cards" (global, and per-board override) still hides the whole Completed section.
- **Repeating cards:** with a due date, a card can repeat every day, weekday, week, 2 weeks, month or year. Finishing it leaves the finished copy to sink into Completed and puts a fresh copy (checklist reset) right next to where it was in the board's sequence, with the next due date; if finished late, the next one jumps to the next date that isn't in the past. Undo removes the copy.

**Calendar** (top-bar calendar button; key C on desktop)
- Month grid; due cards on their date (with time), future repeats of cards shown faded; tick cards off from the day list. A card auto-dated by a weekly board's weekday divider (B36, §2) shows up here exactly like any other due card - no calendar-specific code needed, since it just keys off `card.due` either way.
- **Events** like Google Calendar: all-day (optionally multi-day) or timed, colour, notes, reminder (none / at start / 5, 10, 30, 60 min / 1 day before), repeat (same options as cards) with optional "repeat until".
- Add tasks from the calendar onto any board (no list sub-choice any more), with due time, priority and repeat.

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
- **Every reminder reaches every device** that has notifications turned on, no matter which device (or the assistant) created it. All devices share one schedule on the push server through a secret group key stored in the synced data (`pushGroup`). Any device sends the schedule, even one with notifications off, so a reminder made on the laptop still reaches the phone. The newest data wins, so a device with older data can't overwrite a newer schedule. Needs GitHub sync (or the sync folder) so the devices share data.
- **On/off is per device** (localStorage `docket.notify`); before 2026-10-06 it was a synced setting, and each device keeps its earlier choice. The status check lists the devices that get reminders, and the test button sends a test to all of them.

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
| `index.html` | The whole app. CSS tokens and themes, then one script in sections (`/* ===== name ===== */`): constants (incl. repeat engine `repeatHits`/`nextRepeat`, priority, tags, divider presets), themes and accents, state + `normalize()` (upgrades all older data, incl. the B33 lists[]→seq[] migration), time tracking, pomodoro, sound and notifications, push reminders (`reminderItems`, `scheduleLocal`, status check), haptics, rendering (`boardSeqHTML` renders one board's dividers/cards/Completed section), actions (`setDone`, `spawnNext`), event delegation, drag and drop, sheets and menus (+ desktop column helper), backup, sync folder, GitHub sync, time panel (focus/hours/stats), task/entry/job editors, calendar and events, AI assistant, copy card, export, tags, card detail, toast, installable app, boot. `window.docketDebug` exposes read-only `reminderItems()`, `health()`, `weekdayToday()`, `currentWeekDates()` and `weekdayDateLabel(iso)` (B36), plus test-only `moveCardToCategory(cardId, catId)` (cross-board move, same as dragging a card onto another board's tab), `checkWeeklyResets()` (B35) and `moveCardWithinBoard(cardId, dividerId)` (B36 - same-board reposition, used to exercise `syncDueFromDivider()` without a real pointer drag). |
| `sw.js` | Service worker: shell cache (`VERSION`; bump it when icons, manifest or sw.js change; on activate it deletes only caches starting with `docket-`, because every `*.github.io` site shares this origin's Cache Storage), network-first page, cached fonts and ExcelJS, push handling (pushes are empty; it fetches the text from the push server's `/pending`), notification click, `pushsubscriptionchange` (re-subscribes and calls `/move`). |
| `manifest.webmanifest`, `icons/` | PWA metadata and icons (generated with Pillow). |
| `HANDOFF.md` | This file. |

**Data model** (`state`, saved as JSON):
- `categories[] {id, name, color, jobId?, sort, hideDone, seq[], resetDay, carryForward, lastResetAt}` - **as of B33 (2026-10-18)**, a board (category) is one ordered sequence mixing cards and dividers, instead of multiple `lists[]` of cards. `sort` ('manual'|'priority'|'due') is now one board-level setting (used to be per-list); `hideDone` (`true`/`false`/`null`=follow the global `settings.hideDone`) is the board-level "hide completed cards" override (replaces the old per-list `hideDone` and the old `doneMode` move/leave/hide choice - finished cards always auto-sink now, see §2, so only hiding the Completed section is still a choice). **B35 (2026-10-18):** `resetDay` (`null`, or 0-6 = Monday-Sunday, matching `WEEKDAY_NAMES`/`DIVIDER_PRESETS.slice(1,8)`) and `carryForward` (bool, default false) are the weekly auto-reset settings; `lastResetAt` (ISO date, `''` until the first reset) records when it last actually fired so `checkWeeklyResets()` can't double-fire - see §2 "Weekly auto-reset" and `performReset()`/`checkWeeklyResets()` in `index.html`.
- `seq[]`: cards and dividers interleaved, in stored (not necessarily visual - see `sort`) order. A **divider** is `{id, type:'divider', label, color, missed}` - just a label line, not a card. `color` (B35) is `null` or one of the app's 6 label colors (`LABEL_KEYS`), optional. `missed` (B35) flags the one divider a weekly reset creates/reuses to hold swept-up unfinished cards (see §2) - an otherwise completely ordinary divider. Everything else in `seq[]` is a **card**, found the same way a divider is (`it.type !== 'divider'`).
- **B35 presets:** `state.dividerPresets[] {id, label, color, favorite}` and `state.boardPresets[] {id, name, dividers:[{label,color}], favorite}` hold user-created presets for the two preset pickers; `state.dividerPresetFav {}` and `state.boardPresetFav {}` are small synced maps (keyed by the built-in's label / `BOARD_PRESETS` id) holding favorite state for the *built-in* presets, since those themselves aren't stored (synthesized at render time from the `DIVIDER_PRESETS`/`BOARD_PRESETS` constants - see `allDividerPresets()`/`allBoardPresets()`).
- `cards[] {id, title, desc, done, doneAt?, tags[], due, dueTime, dueFromDivider, repeat, priority 0-4, pinned, checklist[], jobId?, spawned?, repeatWas?, created}` - `doneAt` (timestamp) is set when `done` becomes true and used to order the Completed section (most-recently-finished first); a card's position in `seq[]` never changes when it's finished/unfinished, so "un-tick returns it to where it came from" is free - it was never moved. The old `fromList` bookkeeping (which list a card came from) is gone along with lists. **B36:** `dueFromDivider` (bool, default `false`) flags a `due` date that was auto-assigned by a weekly board's weekday divider (see §2 "Weekly board dates + due-date auto-sync") rather than set deliberately by the user - `normalize()` forces it back to `false` whenever `due` is empty, since the flag is meaningless without a date. A repeating card's next spawned copy (`spawnNext()`) always gets `dueFromDivider: false` even if the original had it set, since the next date comes from the repeat schedule, not a divider.
- `tags[] {id, name, color, group}`
- `jobs[] {id, name, color, rate, currency}`
- `entries[] {id, jobId, cardId, title, start, end|null, note, undated?}`
- `wtasks[]` (work tasks added without time)
- `events[] {id, title, date, endDate, allDay, start, end, color, notes, repeat, until, remind}`
- `reminders[] {id, at, title, body, repeat, until}`
- `pomo`, `pomoRun`, `settings {theme, accent, hideDone, notify (legacy, now per device), notifyPrefs, haptics, workJob, workPeriod}`, `savedAt`, `active`. `settings.autoMoveDone` is no longer read (auto-sink is unconditional); the field is harmless if still present in old synced data.
- `pushGroup`: random 43-character secret shared by all devices; names the user's shared reminder schedule on the push server. Created once (only after the first GitHub/folder pull, so it can't make an old copy win).

**B33 migration** (`normalize()`): a category with the old `lists[]` shape (no `seq[]` yet) is converted once: each list, in order, becomes a divider carrying that list's old title (even an old `isDone` list - it becomes a perfectly normal divider; which cards are "done" is tracked per-card via `done`/`doneAt`, not by which section they're filed under), followed by that list's cards in their old order, appended to the board's new `seq[]`. No card is dropped. A list-level `hideDone` override (there could be several, disagreeing, across a board's old lists) folds into the one new board-level `hideDone`: the first explicit (non-null) one found wins; an old `doneMode: 'hide'` with no explicit list override also sets `hideDone: true`. Covered by `tests/smoke21.js` (fixture with 2-3 old lists incl. one `isDone`, asserts order and that every card survives) and exercised on every boot via `seed()`, which still produces the old `lists[]` shape so the migration path itself stays live in normal testing.

Device-only (never synced): localStorage `docket.github` (sync token), `docket.ai` (provider, keys{}, models{}, custom instructions), `docket.aimodels` (model-list cache), `docket.aichat` (chat), `docket.notify` (notifications on for this device), `docket.pushgroup` (group and endpoint this device last registered, to leave an old group); IndexedDB `docket` (sync-folder handle).

**Sync rule:** newest `savedAt` wins for the whole document (last-writer-wins). Every GitHub save is a commit in `docket-data`, so any earlier version can be restored from its history.

**Reminders:** `reminderItems()` builds up to 100 reminders for the next 45 days (pomodoro, due cards, events, one-off and repeating reminders). Every device sends them to the shared group on the push server (`POST /g/sync` with `group`, `savedAt`, `items`, and `endpoint` + `device` name when notifications are on there) whenever they change or newer data arrives, and they are fired locally by `scheduleLocal()` while the app is open (same tags, so duplicates replace each other).

## 4. AI assistant

- Works with **OpenRouter** or **Google Gemini** through their OpenAI-compatible `/chat/completions` endpoints. Both allow direct browser calls (checked 2026-10-06). The user brings their own keys.
- Settings → AI assistant: each provider keeps **its own key and chosen model**. The model is picked from a **drop-down** filled from the provider's live list (OpenRouter: only tool-capable models, with prices; grouped Recommended / Free / by company; filter box), cached for a day. There is also an optional "Your instructions" box.
- **Every time it is opened it starts a new chat.**
- **Harness** (`aiSystemPrompt()`): role; how Docket works (boards are a single column of cards, with optional labeled dividers to organize them, since B33); right now (local time, this week's dates, boards' open-card counts, tags, the next 7 days, notification status); how to work; writing guidelines; limits; style; plus the user's own instructions. If it was opened from an item, a "What the user is working on" section with that item's full data comes first (`aiCtxPrompt()`).
- **Tools:** find_cards, get_card, create_card, update_card, create_divider, create_event, get_event, update_event, list_events, set_reminder (all support repeats). `create_divider` replaced the pre-B33 `create_list` (lists don't exist any more); `create_card`/`update_card` lost their `list`/`move_to_list` params for the same reason - a card just goes onto a board. It **cannot delete** anything. Up to 6 tool rounds per message. Every reply that changed data has **Undo**.
- **Ask AI from an item:** ✨ buttons in the card window, the event editor and the calendar day open it focused on that item (`aiChat.ctx`), with a "Working on …" bar and item-specific suggestions. On the phone, closing returns to the item.
- Tested with a mocked model (tests smoke12, 13, 16). **It has not been run against a real model with a real key yet, so the first real use is the real test.**

## 5. Push server (Cloudflare Worker)

Source: `projects/kanban-todo-app/output/push-worker/` on the user's server (not in the public repo).
- **Group** Durable Object (one per `pushGroup` key, named by its SHA-256): holds the user's one schedule, its `savedAt` (older data is refused), and the list of registered devices (max 20). Its **alarm** fires at the next reminder and delivers it to every device; devices whose push subscription is gone (404/410) are dropped.
- **Inbox** Durable Object (one per push subscription): the device's outbox. Delivery puts the reminder there and sends an **empty VAPID-signed push**; the service worker then fetches the text from `/pending`.
- Endpoints (POST, JSON): `/g/sync` (`group`, `savedAt`, `items`, optional `endpoint`, `device`), `/g/leave` (`group`, `endpoint`), `/g/test` (`group`, `device`: test to all devices), `/pending` (`endpoint`), `/move` (`endpoint`, `to`: subscription renewal, also moves group membership), `/unsubscribe`. The old per-device `/sync` and `/test` still work for out-of-date app copies. `GET /` is a health check.
- Shared groups added 2026-10-06 (migration tag `v2`). Verified live with simulated devices: a reminder created by one device (and one by a device with notifications off) reached both devices' outboxes; a stale `savedAt` was refused; test-to-all, leave and move worked.
- Deployed 2026-10-06. Verified live: CORS limited to `https://ethecho-ui.github.io`, `/sync` sets the alarm, the alarm fired on time, VAPID signing works.
- Redeploy: `wrangler deploy` inside `push-worker/` (the secret is already set). Free plan (checked 2026-10-05): SQLite Durable Objects and alarms allowed, 100k requests/day, 10 ms CPU per invocation.
- Each device must turn notifications on once (Settings → Notifications → Turn on / Fix) to register; from then on it gets every reminder from every device.

## 6. How to work on it

- Edit `index.html` (and `sw.js` when needed), run the tests, commit, `git push`. GitHub Pages rebuilds in about 30–60 s; the page is network-first, so users get updates on reload (desktop: Ctrl+Shift+R if cached).
- **Roll back the app:** `git revert <commit>` and push. **Restore user data:** take an older `docket-data.json` from the `docket-data` repo history and restore it in the app (Settings → Restore from backup).
- **Tests:** `projects/kanban-todo-app/tests/` has jsdom smoke tests per feature (smoke5–17; table in `tests/README.md`). Each prints `ERRORS []` when clean. `smoke14` and `smoke16` take `phone|desktop`. Run all of them after every change.
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
