# Database operations

SQLite stores teacher content locally using Drizzle ORM and the Node libSQL
client. No cloud account, token or external database service is required.
Schema: `src/lib/db/schema.mjs`; migrations: `drizzle/`.

## Data model

```text
word_lists ───< words ───< word_phonemes >─── phonemes
     └───< activity_configurations
                 └── Wordle answer references a word in the same list
```

- `phonemes`: 43 complete reference symbols with labels/examples/groups.
- `word_lists`: title, description, IDs and UTC timestamps.
- `words`: list membership, stable ID, position, English equivalent and hint.
- `word_phonemes`: word ID, token position and inventory-symbol foreign key.
  A multi-character phoneme occupies one row; repeated tokens remain separate.
- `activity_configurations`: list, title/type, answer/guesses or grid/difficulty,
  hints, output theme/filename and timestamps. Multiple configurations share a list.

Readers sort positions and reject missing, gapped or unsupported tokens.
Database CHECK constraints protect settings shapes, lengths, booleans and names.
Foreign keys protect ownership/inventory references. Deleting a list cascades its
words/configurations; a referenced Wordle answer cannot be deleted individually.
Services additionally enforce cross-row limits and relationships; direct SQL
bypasses those safeguards and must maintain timestamps itself.

## Paths and startup

Default local path: `data/phonemele.db`, relative to the project. Override
`DATABASE_PATH` before startup to use another server-side path; never make it a
`NEXT_PUBLIC_` variable. Production startup freezes the absolute path before the
standalone server changes working directory.

Connections enable foreign keys, WAL and a five-second busy timeout. The server
reuses one connection and queues database operations across routes. Storage is
outside build artifacts and excluded from Git/Docker's build context.

`npm run dev`, `npm run start` and Docker startup apply migrations before serving
requests. They seed only the phoneme inventory. Repeated startup preserves
teacher data; a failed migration stops boot.

## Schema changes

```sh
npm run db:generate -- --name=describe_the_change
npm run db:migrate
```

Review generated SQL and schema metadata and commit them together. Never rewrite
an already applied migration. Back up data before migration and test on an
isolated copy. Do not generate a new migration just to initialise the app.

## Persistence and backup

Local and Docker databases are independent. Compose mounts `teacher-data` at
`/app/data`; the non-root container uses `/app/data/phonemele.db`.
`docker compose down` preserves the named volume. Do not use `--volumes`, `-v`
or volume pruning unless intentionally deleting its teacher content.

Stop the application before copying its database/directory or backing up a
volume, or use SQLite's backup facility. Copying only an active `.db` may omit
changes in `-wal`. Keep and verify a backup before replacing or repairing data.
Restore only while the app is stopped; ensure the restored files are writable
by the runtime user. Do not delete storage as a routine recovery step.

## Troubleshooting and limits

Check `/health/database` and server logs. Verify the path and write permissions,
then run `npm run db:migrate` against the intended database if setup is missing.
Corrupt saved phonemes return a safe 503 on record read/generation; they are not
silently shortened or repaired.

This architecture supports one local app, not independently scaled replicas
sharing a SQLite file. Multi-user/public deployment needs authentication,
authorization, backups and a concurrency policy; consider a client/server
database if scale requires it. See [backend](backend.md) and [testing](testing.md).
