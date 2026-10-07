# Step 5: teacher-facing CRUD

This records the Step 5 checkpoint. Step 6 now connects the saved records to both
activity builders; see [the current saved-generation workflow](saved-generation.md).
References below to generation being pending describe the Step 5 state.

## Scope

The Teacher Library at `/library` implements create/read/update/delete for word
lists, individual words, and multiple Wordle/Word Search configurations. It uses
the Step 4 schema without changing or regenerating its applied migration.

Instructions 5.1–5.3 are implemented and verified. Instruction **5.4 requires
recorded video evidence of word CRUD**; that demonstration remains pending for
Step 8. Test results are not a substitute for the required video. Saved-data
generation is Step 6, not part of this increment: the existing builders still
generate from temporary editor values, not a configuration ID.

## Teacher workflow

1. Start with `npm run dev`, or build and use `npm run start`. For Docker, use
   the startup/trusted-CA instructions in [docker.md](docker.md).
2. Open **Library** in the navigation. Create a named list with an optional
   description, or select an existing list. Lists are initially empty.
3. Choose phonemes in order using the inherited keyboard. Save the word with
   optional English text and a word hint. Multi-character symbols stay complete
   tokens. A word has 1–15 tokens; a list has at most 30 words.
4. Use **Edit word**, change its tokens/text/hint, then **Save word**. Its ID and
   position stay stable. Use **Cancel word edit** to discard the draft.
5. Create one or more activity configurations. Wordle selects an answer from
   the current list and 3–8 guesses. Word Search saves a 6–15 grid size and
   easy/hard difficulty. Both save a title, hints toggle, output theme and safe
   `.html` filename. Use the configuration's Edit button to read/update it.
6. Reload the page and select the list again: saved words and configurations
   are retrieved from SQLite. Form drafts are not saved automatically. Switching
   lists/editors or reloading saved content discards unsaved form changes, as
   stated on the page. Cancel buttons are available for each edit form.
7. Use Delete on a word, configuration, or whole list; review the inline warning
   before confirming. Cancelling does not delete anything. A whole-list deletion
   permanently removes its words and configurations as well.

Local and Docker databases are separate. The local default is
`data/phonemele.db`; Docker keeps its file in the named `teacher-data` volume.
Do not stop Compose with `--volumes` if you want to preserve teacher content.

## API contract

All handlers use the Node runtime, return `Cache-Control: no-store`, and await
Next 16's asynchronous route parameters. JSON writes use the existing bounded
32 KiB reader. Single-record responses are `{ "data": record }`; collection
responses are `{ "data": [...], "total": n, "limit": n, "offset": n }`.
The list's words endpoint returns `{ "data": [...] }` in saved position order.

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/word-lists` | GET, POST | List summaries; create a list |
| `/api/word-lists/:id` | GET, PATCH, DELETE | Read/update details; cascade-delete a list |
| `/api/word-lists/:id/words` | GET, POST | Read ordered words; append a word |
| `/api/words/:id` | GET, PATCH, DELETE | Read/update/delete one word |
| `/api/configurations` | GET, POST | List or create saved activity configurations |
| `/api/configurations/:id` | GET, PATCH, DELETE | Read/update/delete a configuration and read its list snapshot |

Creation returns 201; successful reads/updates return 200; successful deletion
returns 204 with no body. PATCH accepts only explicitly allowed fields and at
least one field. The ID, timestamps, positions, type, and list ownership cannot
be reassigned through a word update. Activity type and list ownership cannot
change on an existing configuration; create a new one instead.

Lists/configurations use `limit` (default 50, range 1–100) and `offset` (default
0, range 0–1,000,000). Configurations additionally accept `wordListId` and/or
`type=wordle|wordsearch`. The UI exposes Load more controls. List summaries
include accurate word/configuration counts; record reads include complete data.

Example word body:

```json
{ "phonemes": ["tʃ", "eː"], "englishWord": "chair", "hint": "A seat" }
```

Example Wordle configuration body (replace IDs with real saved records):

```json
{
  "title": "Chair practice", "wordListId": "saved-list-id", "type": "wordle",
  "answerWordId": "saved-word-id", "maxGuesses": 5,
  "showHints": true, "outputTheme": "dark", "outputFilename": "chair.html"
}
```

For Word Search, replace answer/guesses with `gridSize` and `difficulty`.
Creation defaults hints to true, output theme to light, and filename to
`phonemele-<type>.html` if omitted. Type-specific settings remain required.

## Service, relationships and error handling

`src/lib/server/storage.js` is the server-only ORM service. Route handlers stay
thin; `storage-validation.js` handles field validation, and `storage-http.js`
handles HTTP responses and same-origin mutation checks. The browser client
`src/lib/api/storage.js` provides a 15-second timeout, cancellation and readable
errors; it never automatically retries writes that might already have committed.

Each service operation runs inside an ORM transaction. Word creation/update
writes metadata and ordered token rows atomically, and touches the parent list's
timestamp. IDs stay stable when editing. Reads of a configuration and its list
share one transaction. All application database work, including readiness, is
queued through `withDatabase`: the single local libSQL connection cannot be
borrowed while another transaction owns it. Concurrent API requests therefore
do not produce `TRANSACTION_ACTIVE` errors or duplicate word positions.

Relationship guards keep saved configurations usable:

- Wordle answers must belong to the selected list. Deleting a selected answer
  returns 409 until the teacher changes/deletes that configuration.
- Words must fit every saved Word Search grid for their list. A longer create
  or edit returns 409, identifies a configuration to adjust, and leaves saved
  data unchanged. This checks size, not guaranteed random puzzle placement;
  placement failures remain handled by the generation service.
- The last word cannot be removed while a saved Word Search still uses its list.
- Whole-list deletion deliberately cascades its owned words/configurations;
  unrelated lists are preserved. Confirmation is a UI safeguard, not a second
  database flag: API callers must intentionally issue DELETE.

Errors are `{ "error": { "message": "..." } }`: 400 invalid data, 403
cross-site write, 404 missing record, 409 content conflict, 413 oversized JSON,
415 unsupported media type, and generic 503 for unexpected database failure.
Detailed unexpected errors are logged only on the server. Mutation Origin is
checked against protocol and Host because Next's standalone request URL can
normalize its hostname. Cross-site Fetch Metadata is rejected as well.

This is a local, single-app classroom prototype, **not an authenticated
multi-user service**. Origin checks do not provide authentication. Keep the
documented loopback binding; add authentication/authorization, trusted-proxy
configuration for HTTPS, backups and concurrency/version policy before any
public or multi-user deployment. The current edit policy is last successful
writer wins; there is no optimistic-concurrency token.

## Verification on 7 October 2026

- `npm run lint` and the production build passed with every CRUD route and
  `/library` included. No dependency/schema changes were needed.
- The existing 22 database checks passed, including migration idempotency,
  ordered/repeated complete phonemes, rollback, constraints and restart reads.
- `npm run test:backend` passed **48 checks**: the previous 28 normal checks,
  19 new CRUD groups, and one isolated readiness-failure check. CRUD tests cover
  all entities, multiple configurations of both types, paging/counts, malformed
  inputs, same-origin writes, protected deletions, list cascades, simultaneous
  requests, and the 30-word bound under concurrent insertion.
- Linux Docker build, non-root runtime and readiness passed. All **47 normal
  HTTP checks** passed both before and after replacing the container. The 22
  direct storage checks also passed. Additionally, words created/edited through
  the API and both API-created configuration types retained their IDs, ordered
  tokens, hints and output settings after container replacement on the same
  disposable volume. The image contains no host database or fixture writer.
- Interactive production-browser checks used a temporary database, not teacher
  storage: create/read/edit a word containing `tʃ` and `eː`; save both configuration
  types; edit Wordle guesses; reload and read back edited hints/settings;
  display a saved-grid conflict without changing the stored word; show the
  cascade warning, disable editors during confirmation and cancel deletion.
  Actual DELETE operations were exercised by the HTTP suite, not by clicking
  the browser's final permanent-delete control. Mobile/desktop layout checks
  reported no horizontal page overflow (observed inner widths 355 and 1164).
- Browser testing caught incorrect embedded aggregate counts; the service now
  uses page-scoped aggregate queries, and count assertions are in the HTTP suite.
  Same-origin HTTP tests also caught and corrected standalone host normalization.

`scripts/crud-checks.mjs` tracks only lists created by its own run and cleans up
only those records. `test:backend` owns its temporary database by default;
`TEST_BASE_URL` explicitly targets an existing loopback app and will briefly
create/delete isolated test lists there. Docker verification owns a labelled
temporary volume. `node scripts/preview-verification.mjs` opens an interactive
isolated browser-QA server; enter `stop` to close it and remove its disposable
database. Stop the preview before rebuilding on Windows to release file locks.
Verification left no test records in the teacher databases.

## Video evidence still required (5.4 / Step 8)

Record a disposable demonstration list, not real classroom data. Show adding a
word via the keyboard and saving it, reloading/reading it from the database,
editing tokens/text/hint and saving, then deleting an unused word and showing
that it no longer appears after reload. Also demonstrate multiple saved activity
configurations. The full Step 8 walkthrough must additionally cover ID in the
first 30 seconds, face/narration, architecture, stored-data generation (Step 6),
`/health` 200, and Docker. No new video has been recorded in this increment.
