# Step 2: backend supporting the builders

This records the Step 2 increment. Step 4 has since added the storage foundation
and `/health/database`; see `database.md`. The generation route still uses editor
values until saved-data generation is connected in Step 6.

The backend runs inside the existing Next.js application using App Router Route
Handlers. There is no separate Express service or additional runtime dependency.
This step implements all of instruction 2's nested requirements:

| Requirement | Implementation |
| --- | --- |
| 2.1 Server-side activity logic | `src/lib/server/activities.js` validates activity settings, generates Word Search puzzles, and composes both HTML activity types. |
| 2.2 Frontend/backend communication | Both builder pages use `src/lib/api/activities.js` to call `POST /api/activities/generate`. |
| 2.3 Wordle and Word Search use case | The existing phoneme keyboard, game previews, settings, themes, and standalone student HTML outputs remain supported. |

## Request flow

The builder sends JSON to the route handler. The handler reads a bounded request,
then calls the activity service. The service validates the content and uses the
existing generation/export modules to return JSON containing the downloadable
HTML. Server modules use `server-only` to prevent imports into client bundles.

Wordle's interactive preview remains local. Selecting Generate sends its answer,
English equivalent, guess count, hints, and current theme to the backend.

Word Search calls the backend after word-list, size, or difficulty changes, with
a short debounce. One response supplies both the preview puzzle and the HTML
containing that exact puzzle. Generate downloads that returned HTML. Superseded
requests are aborted and ignored, and new puzzles reset the preview's selected
and found cells. Empty lists and pending/failed requests disable downloading.

Both builders show service errors. Word Search offers Try again; Wordle's Generate
button becomes available again. Requests time out after 15 seconds.

## API contract

### `GET /health`

Returns `200 OK` and `{"status":"ok","service":"phonemele"}` with
`Cache-Control: no-store`. This is application liveness, not database readiness:
no database exists at this step.

### `POST /api/activities/generate`

Content type: `application/json`. Request body limit: 32 KiB, checked against the
actual incoming stream rather than trusting a Content-Length header.

Wordle example:

```json
{
  "type": "wordle",
  "theme": "dark",
  "config": {
    "answer": ["tʃ", "eː"],
    "englishWord": "chair",
    "maxGuesses": 6,
    "showHints": true
  }
}
```

Word Search example:

```json
{
  "type": "wordsearch",
  "theme": "light",
  "config": {
    "words": [["tʃ", "eː"], ["dʒ", "æ", "m"]],
    "size": 10,
    "difficulty": "easy"
  }
}
```

Successful responses are `200 OK` with `{ filename, html }`. Word Search also
returns `preview: { grid, placements, failed: [] }`. All responses from the
handler use `Cache-Control: no-store`. No response claims that content was saved.

Validation rules:

- Activity type is `wordle` or `wordsearch`; theme is `light` or `dark`.
- Phoneme words are nonempty arrays of complete inventory tokens, never strings
  split into characters. Multi-character symbols retain their order.
- Wordle: 1–15 phonemes, English text up to 120 characters (empty is allowed,
  matching the existing optional field), 3–8 integer guesses, boolean hints.
- Word Search: 1–30 words, integer grid size 6–15, `easy` or `hard` difficulty.
  Each word contains 1–grid-size phonemes.
- Size/count limits bound server work. Five complete generation attempts are
  allowed; no partial puzzle is returned if requested words cannot all fit.
- Unknown request properties are ignored; only validated fields reach exports.
- Teacher text embedded in scripts retains the existing safe JSON serialization.

Errors have the shape `{"error":{"message":"Explanation for the teacher"}}`:

| Status | Meaning |
| --- | --- |
| 400 | Invalid JSON or invalid/missing activity fields |
| 405 | Unsupported HTTP method (handled by Next.js; its response is not the custom JSON envelope) |
| 413 | Request body exceeds 32 KiB |
| 415 | Request content type is not JSON |
| 422 | A complete Word Search puzzle could not be generated |
| 500 | Unexpected server error; details are logged server-side, not sent to the client |

## Persistence boundary and later steps

This is a stateless backend. Step 4 will introduce a database schema and ORM;
Step 5 will add stored-word/list/configuration CRUD. Step 6 will source generation
data from saved records. The service boundary accepts ordered words and activity
settings so it can later be called with database-loaded content. No in-memory
store or temporary fake CRUD implementation has been introduced.

The later schema must distinguish word identity/English text/ordered phonemes,
list membership, activity type, type-specific settings, hints, and output
metadata. Concrete relationships, migrations, and provider selection belong to
Step 4 and will be verified there. Instruction 1.2's database extension and the
full requirements of Steps 4–7 are not marked complete by this work.

## Verification

Run `npm run lint`, `npm run build`, then `npm run test:backend`.
The backend verification script starts a temporary production server on loopback,
tests HTTP behavior, and stops it afterward. It covers liveness, existing pages,
both activity types, token/settings/theme preservation, safe script embedding,
preview/export agreement, validation failures, request limits, and incomplete
puzzles. See `scripts/verify-backend.mjs` for the executable checks.

Browser verification covers Wordle generation and service-unavailable messaging,
Word Search regeneration after settings changes, loading/disabled controls, and
preview reset behavior. On 7 October 2026, lint, the production build, and all 26
HTTP checks passed. Browser checks also confirmed single-phoneme selection,
invalid-word errors with disabled export, recovery after correcting grid size,
and found-word counts resetting for a new puzzle. Wordle reached its download
feedback in the browser; the automated browser download observer timed out, so
this record does not claim verification of files saved by the browser.

A complete offline-play/export regression remains part
of Step 6; API-level HTML checks do not replace that assessment requirement.
