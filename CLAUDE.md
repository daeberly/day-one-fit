# Day One Fit: project brief for Claude Code

Read this first. It is the full background for a project that was built over many iterations in a Claude chat and is now moving to Claude Code.

## Why this exists

The owner goes by **D**. He is 5'10" with three kids. On **Nov 15, 2026** he reset "Day One" of a serious health push:

- **Weight:** about 218 lb down to **180 lb by May 31, 2027** (his birthday month). That is roughly 38-40 lb in about 28 weeks, about 1.35-1.4 lb/week, about 675-710 kcal/day deficit.
- **Body composition:** very low visceral fat, target about 14-16% body fat with visible 2-4 pack abs, chest, arms and legs. Muscular and toned, not just lighter.
- **Fitness:** strong, flexible, and athletic enough to play sports and compete with his kids.
- **Behavior:** he wants **strict coaching and a strict schedule**. When he falls behind, the app must tell him exactly what to do to get back on path or make up what he missed. He wants specifics on what to do and not do.
- **Style:** deep stretch under tension, slow lowering, last set 1 rep left and earlier sets 2-3 shy of failure, progressive overload, high stimulus-to-fatigue exercises, sprint/agility/plyo work, core for visible abs.

The app is his all-in-one tracker so he does not need several apps. It is a personal tool, not a product.

## What the app is

**Day One Fit** is a single-file vanilla JavaScript PWA.

- Live: https://daeberly.github.io/day-one-fit/ (GitHub Pages, branch `main`, root).
- Repo: github.com/daeberly/day-one-fit
- D uses it on an **iPhone, installed with Safari "Add to Home Screen"**. iOS aggressively caches PWAs, so every release must bump the service worker cache name (see Release checklist).

Repo files:

- `index.html`: the whole app (HTML, CSS and JS, about 235 KB). All logic is inside one IIFE.
- `sw.js`: network-first, GET-only service worker. Cache name `dayone-vNN`.
- `manifest.json`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`: PWA assets (icons carry a `?v=3` cache buster; the logo is a photo of a kid in a helmet with a "DAY ONE FIT" band).
- `README.md`: user-facing docs, one section per version.
- `tests/`: jsdom regression suite (see Testing).

## Hard constraints (do not break these)

- **Single file, vanilla ES5-style JS.** No framework, no build step, no CDN, no external fonts or scripts. It must work offline.
- **Privacy:** all data stays on the phone (`localStorage` and IndexedDB). Nothing is sent anywhere except the two optional AI features, and only when D taps the button.
- **The Anthropic API key** lives only in `localStorage['dayone.key']`. It must NEVER be inside the main state `S` and never in the backup export. API calls go straight from the browser: `POST https://api.anthropic.com/v1/messages` with headers `content-type`, `x-api-key`, `anthropic-version: 2023-06-01`, `anthropic-dangerous-direct-browser-access: true`. Default model `claude-sonnet-5-5`, editable in More (`S.settings.aiModel`).
- **Be honest about limits.** A web app on iOS cannot read Apple Watch or HealthKit or Bluetooth heart-rate straps. Calorie, protein, burn and body-fat numbers are estimates and must be labeled as such. Photos must not be used to produce a body-fat number (the monthly photo read deliberately avoids it).
- Plain, direct language in the UI. No flattery. Coaching copy should be strict but practical and safe (never advise crash dieting; cap suggested extra deficits around 250-300 kcal/day).

## Data model

State is one object `S` saved to `localStorage` key `dayone.v1`:

`{ settings, weights, days, tests, reads }`

- `S.settings`: `startDate, startWeight, goalWeight, goalDate, waterGoal, autoRest, kcalGoal, hrAge, hrMax, heightIn, protGoal, maint, lastCheckin, snooze, timerVoice, sched{id:'HH:MM'}, aiModel, cpref{base:id}` (last cardio choice per slot).
- `S.weights`: `[{id,date,w,time,tod,...}]`. The 7-day moving average (`wSeries().ma`) drives all pace math, not single readings.
- `S.days[YYYY-MM-DD]`:
  - `sets{exId:[{w,r,done,ts}]}`, `cardio{id:{done,dts,min,rpe,hravg,hrpk,hrrec,note,p{partId:[{d,t,ts}]}}}`
  - `meals{slot:status}`, `mealNotes`, `kcal{slot}` (typed override), `prot{slot}`, `foods{slot:[{id,n,k,p,s,a,c,m,src}]}`, `ai{slot:{v,a,c}}`
  - `water`, `sleep{hours,bed}`, `checks{stretch}`, `stretch{idx:ts}`, `warm{idx:ts}`, `hr[]`, `energy`, `feel`, `notes`
  - `stress` (1-5), `alc` (drinks, 150 kcal each, counted in `kcalDay`)
  - `extra[{id,a,min,dist,rpe,hr,hx,hrr,z[5],w,wx,sp,spx,cad,cadx,kc,n,src}]` (anything off-plan)
  - `swap` (workout index moved onto this day), `madeUp` (date, or `'skipped'`)
  - `cpick{base:id}` (cardio option chosen for this day, see `CALT`), `gtg` (pull-up practice sets)
- `S.tests[{id,date,v{metric:value}}]`: monthly baseline tests (times in seconds). Metric list is `TESTS`.
- `S.reads[date]`: stored monthly AI photo reads.
- IndexedDB `dayone-photos`: store `p` (meal photos: `{id,date,slot,ts,full,thumb}`) and store `b` (body photos: `{id,date,pose,ts,full,thumb}`).
- Backup export (More tab) is JSON of `{app:'dayone',version:1,settings,weights,days,tests}` (plus photos in "export all").

## Code structure (all inside index.html)

- Helpers: `today, addDays, diffDays, parse, ymd, fmtD, f1, mean, esc, uid, ensureDay, getDay, toast, numOrU, save`.
- Plan: `WORKOUTS` by weekday (0 Sun pool, 1 Mon speed, 2 Tue legs, 3 Wed upper, 4 Thu pool, 5 Fri posterior, 6 Sat full body). Use **`planFor(d)`** (not `WORKOUTS[...]` directly) so make-up swaps and cardio choices work. Workout entries are `[exId, sets, supersetLetter?]`. `CALT` lists the cardio alternatives for `pool_thu`, `pool_sun` and `speed`; `cPick/cSetPick` resolve and save the choice (an option with logged data wins over the saved preference). Exercises with `asst:true` log assistance in the lb box (less is harder); `first`/`harder` override the overload engine's text. `EX` exercise library, `CARDIO` blocks, `PARTS` per-step checklists, `STRETCH`, `WARM`, `MEALS` (with `.k` kcal and `.p` protein per option), `FOODS` quick-add list, `FMETA` (sugar/category for allowances), `ACTS` activity list with METs.
- Views: `render()` rebuilds `#app` from `viewToday, viewWeight, viewPhotos, viewProgress, viewPlan (the Coach tab, id 'plan'), viewMore`. Tab bar has 6 tabs. Overlays (`#timer, #testov, #hrov, #viewer, #foodov, #tlov`) are body-level divs.
- Events: **delegated**. Click handlers use `data-act` -> `act(a,t)` switch. Change handlers use `data-chg` -> `chg(k,t)` switch. `data-live` range sliders and `data-fq` search use the `input` listener.
- Feature areas (search for these names):
  - Coach: `coachView, numbers, numbersCard, scheduleCard/schedRows/schedICS, catchUp/catchHTML/coachFix, coachStatus/coachBadge, week7/scoreCard, milestoneCard, sizeCard, doDontCard, trendsCard/trendGroups`.
  - Body: `bodyCard, navyBF, bmiBF, bcCalc` (BMI, tape body fat, waist-to-height).
  - Food: `kcalOf/kcalDay/protOf, addFood, foodOpen, allowCard, aiAnalyze/aiParse/aiApply, aiCard`.
  - Activity: `extraCard/extraAdd, scanScreen/scanParse/scanFill, actKcal`.
  - Step logs and timing: `partsHTML/partToggle, warmCard, stretchCard, timeSessions/timingCard/weekTiming`.
  - Photos: `tlHTML/tlOpen/tlSave` (time-lapse), `bodyRead/readHTML` (monthly AI photo read), compare tools.
  - Older: interval timer, heart-rate tools, reminders and monthly check-in, test baseline, progressive-overload engine (`progress`, `sessionsOf(id,d)`), strength index.
- `window.__dayone = {...}` exposes functions and state for the tests. Add new functions you want tested to it.

## Gotchas learned the hard way

- Everything shares one scope, so a **duplicate function name silently overrides** the earlier one. `sessionsOf(id,d)` is the lift-history helper; the workout-timing helper is `timeSessions`. Grep before naming anything.
- `render()` replaces the DOM, which drops input focus. The `change` event fires on blur. Avoid re-rendering inside `input` handlers.
- Date and time inputs need the CSS already in place (`appearance:none; min-width:0; max-width:100%`) or iOS overflows the card.
- `weekOf(date)` and `phaseText` drive training phases (weeks 1-2 learn the load, 3-6, 7+).
- Missed-day logic ignores days before `startDate`. Days since start with no logs count as missed, which is intended strictness.
- Timestamps (`ts`) are recorded when boxes are checked, so timing is only meaningful if D checks as he goes.
- The AI features and time-lapse video saving have only been tested with mocked responses. jsdom has no canvas, so only logic is unit-tested.

## Testing

```
cd tests && npm install && npm test
```

- `test-core.js` (116 checks): setup, workouts, overload engine, heart rate, reminders, tests, settings.
- `test-coach.js` (163 checks): Coach, schedule, catch-up, food, AI (mocked fetch), body composition, allowances, extra activity, scans, trends, step logs, timing.
- All must pass before any commit. Add checks for every new feature in `test-coach.js`.
- Also syntax-check the inline script (`new Function(script)`) and, for UI changes, take a 390 px wide Playwright screenshot.

## Release checklist (every change)

1. Implement and test (above).
2. Bump the visible label in the More tab (`Day One Fit vNN`) and `const V='dayone-vNN'` in `sw.js` (the test checks the label). Add a `## vNN: ...` section to `README.md`.
3. Commit. **Commit title under 50 characters**, plus a description. If earlier versions were never committed, mention them in the title/description. Include the repo's required attribution lines if the environment specifies them.
4. Push. D has asked for updates to be pushed as we iterate. Default: push to `main` so GitHub Pages redeploys (his live app updates about a minute later); if the environment requires a branch and PR, open the PR and tell him. After pushing, tell him to fully close and reopen the home-screen app, and confirm More shows the new version.
5. Reply with: a short summary, the commit title and description, and anything he needs to test on his phone.

## How D likes to work

- Plain, concise answers. Prefer doing the work over asking questions; ask only when a wrong guess is costly.
- He gives short, informal, sometimes voice-dictated requests (typos like "dog food" for "photo" happen). Interpret generously and state the interpretation when it matters.
- He wants honest limits and honest math, not hype. Give real numbers and say when something is an estimate.
- Memory rule from his account: always get his explicit approval before sending or deleting emails or sending calendar invites.

## Status: v19 (Nov 20, 2026)

Delivered so far:

- v1-v8: workout plan and logging, meals with photos, weight log with moving average, interval timer, progress photos with compare tools, monthly baseline test and reminders, heart rate tools, calories, strength balance, exercise figures, pace card.
- v9: Coach tab (strict schedule, catch-up engine, weekly grade, numbers, milestones, lift targets), food quick-add and protein, optional AI meal-photo analysis, body fat/BMI/waist card, time-lapse, Photos tab in the tab bar.
- v10: stress and alcohol logging, monthly AI photo read.
- v11: fruit, juice, milk, cheese allowances and free-sugar tracking.
- v12-v17: extra activity logging (searchable list), screen scan via AI, machine kcal, heart rate avg/max/recovery, avg/max watts/speed/cadence, zone minutes, training baseline and trends.
- v18: step-by-step checklists (speed/agility/plyo, finisher, pool, zone 2), warm-up and stretch checklists, silent timestamps and workout timing with long-workout flags.
- v19: cardio choices on Thu/Sun (swim, bike, row, run, incline walk) and an indoor speed day; pull-up program (strict, band-assisted, negatives, optional practice); assisted dips; arm and lateral-raise work with supersets to keep Wed/Sat near 60 min; no seafood; more protein foods; Add food feedback fix.

D's preferences: no fish or seafood. Sessions 60 min max including warm-up and stretch. Has a full gym at work (fan bike, rower, treadmill, cables, dumbbells, pull-up bar, bands). Goal: 10-15 strict pull-ups, eventually weighted.

## Likely next work (ask D which to do)

- **Weekly check-in:** a review of the last 7 days that recommends specific adjustments (calories, cardio, sleep, lift focus).
- Real-world bug fixes from his daily use on the iPhone (the most valuable input right now).
- Edit or delete past extra activities and step logs; move a logged workout to another day.
- Show timing and zone totals on the Progress tab; export a CSV.
- Tidy the Today tab, which is getting long (collapsible sections).
- Verify on a real iPhone: AI food and screen scans, time-lapse video save, photo read.
- The Coach flags days before he started logging as missed; consider a one-tap "start clean" for new users.
