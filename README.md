# Phoneme'le

A phoneme-based classroom activity builder for Speech Pathology teachers.
Save word lists and activity settings, preview Wordle and Word Search games,
and download self-contained HTML files that students can play offline.

## Features

The application provides:

- live word-list and activity-configuration totals from SQLite;
- a persisted simulated week of generation, failure and time-on-page records;
- live generation counters and bounded Wordle/Word Search page-duration telemetry;
- an activity-type usage summary, alerts and word-list readiness;
- visible links to `/health`, `/health/database` and `/health/metrics`;
- Playwright browser tests, parameterised JMeter load tests and Lighthouse
  accessibility checks.

The Dashboard labels its deterministic sample records separately from live
usage. Teacher-created lists, activity configurations and live metrics persist
only in the local SQLite database.

## Run locally

Requires Node.js 24, npm and a modern browser.

```sh
npm ci
npm run dev
```

Open [the Teacher Library](http://localhost:3000/library). The development server
binds to loopback and updates automatically when code is saved. Keep its terminal
running; Ctrl+C stops it. To use another port: `npm run dev -- --port 3001`.

Development startup applies database migrations and seeds the 43 reference
phonemes plus the idempotent simulated reporting sample. It does not create
example teacher lists or overwrite saved teacher content.

For production:

```sh
npm run build
npm run start
```

Production startup migrates the database, prepares browser assets and starts the
standalone server. Rebuild after code changes; production has no hot reload.

## Teacher workflow

1. Create a list in **Library**.
2. Add words using the phoneme keyboard, with optional English text and hints.
   Each word contains 1–15 complete tokens, including symbols such as `tʃ` and
   `eː`. A list holds up to 30 words.
3. Create a Wordle configuration (one selected answer and 3–8 guesses) or Word Search
   configuration (6–15 grid, easy/hard difficulty). Save title, hints, theme and
   HTML filename.
4. Use **Open … in builder** to load a configuration from the database.
5. Play the preview and use **Download saved …**. Preview and download share
   the same snapshot; a Word Search export contains exactly the displayed grid.
6. After editing stored content, use **Reload and regenerate** in the builder.

A word list is reusable content; an activity configuration has its own title and
game settings. Several activities can use the same list. Saved activity menus
label both names. The teacher Wordle summary identifies its one selected answer;
other source-list words are not alternative answers. Word Search uses all list words.

**Edit this activity configuration in Library** opens the corresponding list and
configuration editor directly. Activities are listed in creation order, oldest
first; edits do not change that order. Saving leaves the editor open and displays
**Saved** beside the button. Changing a field clears that confirmation until the
next save. Closing/cancelling the editor discards only unsaved edits, not saved data.

Only saved changes survive reload. Switching lists/editors discards unsaved
drafts. Delete controls require confirmation; deleting a list also deletes its
words and configurations. Selected Wordle answers cannot be deleted until their
configuration is changed/deleted.

The collapsed **Temporary … editor (not saved)** sections support experiments
without changing Library data. Downloaded games contain their own styles and
JavaScript and do not need this server. Open them in a normal browser to play.

## Storage and Docker

Local storage defaults to `data/phonemele.db`; `DATABASE_PATH` can override it.
Keep backups. Do not copy only a live SQLite file while its WAL is active.

With Docker Desktop's Linux engine running:

```sh
docker compose up --build -d --wait
docker compose down
```

Stop the local server first: both use port 3000. Compose binds only to loopback.
Docker uses a separate persistent `teacher-data` volume; it does not import local
teacher content. Do not add `--volumes` or `-v` to `down` if you want to keep data.
See [Docker setup](docs/docker.md) for TLS-scanning networks and troubleshooting.

## Checks and maintenance

```sh
npm run check
npm run test:docker
npm run test:load:staged
npm run test:accessibility
```

`check` runs lint, a production build, client-error and UI-behavior checks,
database checks, HTTP regressions and two Playwright browser workflows. Tests use
isolated data and temporary servers; they do not overwrite the teacher database.
JMeter requires a separately installed Apache JMeter 5.6.3 and a running local
production server. Lighthouse requires a running local server and Chrome or
Edge. See [testing](docs/testing.md).

The application is a local classroom prototype, not an authenticated multi-user
service. Keep it on loopback. Public deployment requires authentication,
authorization, trusted-proxy handling, backups and a concurrency policy.

## Architecture and guides

- [Backend architecture and API](docs/backend.md)
- [Database schema, migrations and backups](docs/database.md)
- [Docker runtime and certificate trust](docs/docker.md)
- [Testing and troubleshooting](docs/testing.md)

```text
src/app/          Pages and thin Next.js Route Handlers
src/components/   Teacher forms, phoneme keyboard and playable previews
src/data/         Australian English phoneme inventory
src/lib/api/      Browser API clients with cancellation and timeouts
src/lib/server/   Validation, storage services and saved-data generation
src/lib/db/       Drizzle schema, SQLite connection and ordered readers
src/lib/export/   Self-contained student HTML templates
src/lib/wordle/   Duplicate-aware scoring
src/lib/wordsearch/ Grid generation
drizzle/          Tracked SQL migrations and schema metadata
scripts/          Startup, migration and isolated verification helpers
```

Source repository: [kaonun/CSE3CWA-1](https://github.com/kaonun/CSE3CWA-1).
