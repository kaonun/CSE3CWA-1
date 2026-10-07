# Backend architecture and API

Next.js App Router provides pages and backend routes in one application.
Client components manage forms and game state; server-only services validate
requests, access SQLite through Drizzle, and generate offline HTML.

## Boundaries

- `src/lib/api/`: browser fetch clients, 15-second timeouts, cancellation and
  readable failures. Writes are never automatically retried.
- `src/app/api/`: thin Node Route Handlers; dynamic record parameters are awaited.
- `src/lib/server/storage.js`: transactional CRUD and relationship guards.
- `storage-validation.js` and `http.js`: field allowlists, types, bounds and
  strict UTF-8 JSON, limited to 32 KiB including chunked bodies.
- `src/lib/phonemes/validation.mjs`: shared complete-token inventory validation.
- `src/lib/db/`: schema, connection and readers; ordered tokens must be present,
  supported and contiguous before being returned to the UI.
- `saved-activities.js`: reads one configuration/list snapshot, then calls the
  shared activity generator outside the database connection lock.
- `src/lib/export/`: escaped titles, safely serialized script data and standalone
  HTML/CSS/JavaScript. Downloaded games have no API dependencies.

All application database work is queued through `withDatabase`; the single local
libSQL connection cannot be borrowed while another transaction owns it.
Read/update operations use transactions. Word metadata/token rows are replaced
atomically, IDs remain stable, and parent list timestamps reflect word changes.

## Saved-content API

Handled responses are uncached (`Cache-Control: no-store`). JSON writes require
`Content-Type: application/json`. Create returns 201, read/update 200 and
delete 204 with no body.

| Endpoint | Methods |
| --- | --- |
| `/api/word-lists` | GET, POST |
| `/api/word-lists/:id` | GET, PATCH, DELETE |
| `/api/word-lists/:id/words` | GET, POST |
| `/api/words/:id` | GET, PATCH, DELETE |
| `/api/configurations` | GET, POST |
| `/api/configurations/:id` | GET, PATCH, DELETE |
| `/api/configurations/:id/generate` | POST |

Single-record responses are `{ "data": record }`. Collection responses are
`{ "data": [], "total": 0, "limit": 50, "offset": 0 }`; a list's words endpoint
returns `{ "data": [] }` in stored order. Collection paging uses `limit`
(default 50, range 1–100) and `offset` (0–1,000,000). Configurations may additionally
filter by `wordListId` and `type=wordle|wordsearch`. Empty supplied filters are invalid.

List bodies contain required `title` (up to 120) and optional `description`
(up to 1000). Word bodies contain required `phonemes` and optional
`englishWord` (up to 120) and `hint` (up to 300):

```json
{ "phonemes": ["tʃ", "eː"], "englishWord": "chair", "hint": "A seat" }
```

Example configuration (replace IDs with saved records):

```json
{
  "title": "Chair practice",
  "wordListId": "saved-list-id",
  "type": "wordle",
  "answerWordId": "saved-word-id",
  "maxGuesses": 5,
  "showHints": true,
  "outputTheme": "dark",
  "outputFilename": "chair.html"
}
```

Word Search uses `gridSize` and `difficulty` instead of answer/guesses.
Creation defaults hints to true, theme to light and filename to
`phonemele-<type>.html`. PATCH accepts at least one allowed field. Type/list
ownership cannot change on an existing configuration.

## Saved generation

POST `{}` to `/api/configurations/:id/generate`. Client overrides are rejected.
Returns `{ "data": { "configuration": snapshot, "filename": "...", "html": "..." } }`;
Word Search also includes `preview: { grid, placements, failed: [] }`.
Stored titles, words, hints, settings, theme and filename drive the output.
Duplicate word sequences retain independent IDs and metadata.

The builders keep the generated snapshot until explicitly reloaded. Download
uses exactly the same HTML as the preview response. Regenerating a Word Search
creates a new layout. Generation is read-only and does not persist HTML files.

## Temporary generation and health

POST `/api/activities/generate` accepts `{ type, theme, config }`.
Wordle config uses `answer` tokens, `englishWord`, `maxGuesses`, `showHints`,
and optional `hint`. Word Search uses token-array `words`, `size` and
`difficulty`. Returns `{ filename, html }` with a Word Search `preview`.
It does not save teacher data.

GET `/health` returns 200 and `{ "status": "ok", "service": "phonemele" }`.
GET `/health/database` returns 200 and
`{ "status": "ok", "database": "sqlite" }`, or generic 503 when schema/inventory
readiness fails. This is not a full scan of every teacher word.

## Validation and recovery

Words use 1–15 whole inventory tokens; raw strings, malformed arrays and unknown
symbols are rejected. Titles must be nonempty. Stored text must be well-formed
Unicode without null characters. Wordle guesses are integers 3–8; Word Search
grids are integers 6–15 with easy/hard difficulty. Output names use letters,
numbers, dots, underscores or hyphens and end in `.html`.

Answers must belong to their list. Words must fit every saved search grid.
Selected answers and the last word in a saved search list are protected from
individual deletion. Whole-list deletion intentionally cascades only owned data.
Search generation tries five complete layouts and never exports partial puzzles.

Handled errors use `{ "error": { "message": "..." } }`:

| Status | Meaning |
| --- | --- |
| 400 | Invalid fields, phonemes or JSON |
| 403 | Cross-site mutation blocked |
| 404 | Missing/deleted record |
| 409 | Conflict with saved content or list limit |
| 413 / 415 | Oversized body / non-JSON media type |
| 422 | Not all search words could be placed |
| 503 | Storage unavailable or damaged saved phonemes |
| 500 | Unexpected temporary-generation failure |

Unsupported methods use Next.js's built-in 405 response, not this envelope.
Unexpected diagnostics stay in server logs. UI alerts retain rejected form
drafts. After a timeout/broken response, reload to check whether a write succeeded
before repeating it.

Same-origin checks compare Origin with protocol/Host and reject cross-site Fetch
Metadata. They are not authentication. This local single-app deployment uses
last-successful-writer-wins editing, not optimistic concurrency or tenant isolation.
