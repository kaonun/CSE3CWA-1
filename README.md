# Phoneme'le

A phoneme-based classroom activity builder for Speech Pathology teachers.
Save word lists and activity settings, preview Wordle and Word Search games,
and download self-contained HTML files that students can play offline.

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
phonemes. It does not create example teacher lists or overwrite saved content.

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
3. Create a Wordle configuration (answer and 3–8 guesses) or Word Search
   configuration (6–15 grid, easy/hard difficulty). Save title, hints, theme and
   HTML filename.
4. Use **Open … in builder** to load a configuration from the database.
5. Play the preview and use **Download saved …**. Preview and download share
   the same snapshot; a Word Search export contains exactly the displayed grid.
6. After editing stored content, use **Reload and regenerate** in the builder.

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
```

`check` runs lint, a production build, client-error checks, database checks and
HTTP regressions. Tests default to isolated data and temporary servers; they do
not overwrite the teacher database. See [testing](docs/testing.md).

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
