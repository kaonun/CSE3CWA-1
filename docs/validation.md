# Step 7 — validation and error handling

Verified on 7 October 2026. This increment covers all three nested requirements
of Assessment 2's Step 7. It audits and extends safeguards introduced with the
earlier backend, CRUD and saved-generation steps; it does not replace them.

## Requirement coverage

| Requirement | Implementation |
| --- | --- |
| 7.1 Validate before database storage | Services validate allowed fields, types, required titles, metadata lengths, complete phoneme arrays, configuration-specific settings, filenames, and related record ownership. Rejected requests do not enter writes; relational checks and changes use transactions. |
| 7.2 Gracefully handle missing, invalid or malformed phonemes | One inventory-based token validator is shared by writes, generation and storage readers. Readers also require consecutive token positions, preventing incomplete stored sequences from silently changing an answer. |
| 7.3 Clear error messages | Controlled JSON errors, Library/builder alerts, token-count guidance, friendly connection/timeout/unexpected-response messages, and explicit recovery controls. Internal SQL, stack traces and filesystem details stay out of error responses. |

## Input boundaries

- Requests must contain JSON objects with supported fields. Partial updates must
  contain at least one supported field. Malformed or empty bodies return `400`;
  non-JSON media types return `415`.
- The JSON stream is limited to 32 KiB, including chunked requests without a
  `Content-Length`. Oversized requests return `413` before storage. Decoding is
  strict UTF-8: damaged bytes are rejected instead of becoming replacement
  characters in teacher content. JSON media types are case insensitive and may
  include a charset parameter.
- Words contain 1–15 ordered tokens from the 43-symbol inventory. For example,
  `["tʃ", "eː"]` is two tokens, not four characters. Missing arrays, raw strings,
  empty lists, nested arrays, wrong types, unknown symbols and excessive lengths
  are rejected. Tokens are never silently split, trimmed or substituted.
- Token messages distinguish the array/length problem from an unsupported token
  and identify its one-based position without echoing arbitrary input.
- Lists are limited to 30 words. Metadata limits remain title/English word 120,
  description 1000 and hint 300 characters. Stored text must be well-formed
  Unicode without embedded null characters; this also prevents malformed titles
  reaching SQLite's text-length constraints as unexpected database failures.
- Configuration settings remain type-specific: Wordle requires an answer from
  its list and 3–8 guesses; Word Search requires a 6–15 grid, easy/hard difficulty,
  and words that fit. Hints are Boolean, theme is light/dark, and the output name
  is a safe `.html` filename. Empty supplied configuration filters are rejected
  rather than silently becoming unfiltered queries.
- Saved generation accepts only `{}`; the backend rereads and validates the
  stored snapshot. Temporary generation uses the same phoneme validator.
- Existing guards still protect saved answers, grid sizes, list limits under
  concurrent writes, and cross-origin mutations. Output text remains escaped
  and script data safely serialized. Unplaceable searches return `422` without
  a partial activity download.

## Error and recovery contract

Handled API failures use `{ "error": { "message": "..." } }` with `no-store`:

| Status | Meaning / teacher action |
| --- | --- |
| 400 | Invalid request: correct the identified field or phoneme selection. |
| 403 | Cross-site mutation blocked: use this application's own page. |
| 404 | Record missing/deleted: reload saved content or choose another record. |
| 409 | Conflict with saved content: follow the message, such as changing a saved answer before deleting its word. |
| 413 / 415 | Send a smaller JSON request with the correct media type. |
| 422 | Search cannot fit all words: retry, enlarge the grid or shorten/reduce the list. |
| 503 | Storage unavailable or damaged saved phonemes: check server/database setup or restore a known-good backup. |
| 500 | Unexpected temporary-generation failure: a generic message is returned; diagnostic details remain in server logs. |

Unsupported methods use Next.js's built-in `405` response; they do not promise
the application's JSON error envelope.

The Library retains entered form values after a rejected save, displays its
error as an alert, and re-enables editing. Empty phoneme saves are disabled with
an explanation. The 15-token limit now has visible status feedback instead of
silently ignoring further keyboard selections without explanation. Saved
builders show errors and do not enable downloads for failed generation.

The browser API client distinguishes network failures, timeouts, cancelled
navigation and unexpected/non-JSON response bodies. It does not expose raw JSON
parser errors and **never automatically retries writes**. A timeout or broken
response may follow a successful save, so reload and check the stored content
before repeating the action. Unsaved drafts are not persisted automatically.

Direct database edits bypass application safeguards. Missing token rows, gaps
and unsupported symbols are now rejected on read with a safe `503`, not passed
to phoneme UI helpers or exported as shortened answers. These failures are not
silently repaired or deleted. Take the app offline and use a known-good backup
or a deliberate database repair; do not delete `data/` or a Docker volume as a
routine recovery step. This increment does not add a backup management tool.

`/health` remains application liveness. `/health/database` checks schema/inventory
readiness; it is not a full scan of every teacher word. Per-record readers perform
the saved-token integrity checks. Existing local-only scope is unchanged: these
safeguards are not authentication or a claim of public-hosting readiness.

## Verification

Run from the Assignment 2 project:

```bash
npm run lint
npm run build
npm run test:client-errors
npm run test:database
npm run test:backend
npm run test:docker
```

The backend/database scripts default to disposable databases and servers. Docker
verification owns a labelled temporary volume and uses an ephemeral loopback
port. None of these runs overwrite the teacher database or occupy port 3000.
The optional previously verified build-only CA is described in `docker.md`.

Results at this increment:

- Lint and production build passed.
- **74 local HTTP check groups** passed, including rejected create/update
  matrices, unchanged records/metadata/timestamps, null/ill-formed text, malformed
  JSON, damaged UTF-8, chunked body limits, recovery after errors and existing
  CRUD/generation/offline-runtime regressions.
- The local suite deliberately created missing/gapped/unsupported saved token
  fixtures only inside its own temporary database. All 15 list/word/configuration/
  generation reads returned safe `503` errors, and `/health` stayed `200`. Cleanup
  restored inventory readiness. The corruption writer refuses default or
  unrelated database paths and existing teacher lists.
- **23 database check groups** passed across fresh-process write/read phases,
  covering constraints, persistence and the stored-token reader.
- **8 client-error check groups** passed using mocked fetch responses, including
  malformed HTML/JSON, connection failures, timeout uncertainty, no retry,
  cancellation and successful response contracts for saved and temporary workflows.
- Docker built and ran as non-root, with **72 normal HTTP check groups before
  and after container replacement**, 23 database checks and persisted API-created
  words/configurations generating both activity types after replacement. The two
  deliberately destructive local failure groups are not run against a supplied
  `TEST_BASE_URL` or Docker's persistence fixtures.
- Browser checks on an isolated production preview confirmed blank-title
  rejection, successful correction, empty-word guidance, the 15-token cap, a
  valid `tʃ`/`eː` word and configuration save, and a rejected edit retaining its
  draft while the saved title/word remained unchanged. A screenshot was captured.
- Owned test databases, containers, volume and preview tab were removed. The
  teacher's development server on `localhost:3000` was left running.

The earlier direct local-file browser-play check is still manual because the
in-app browser blocks `file:` URLs; Step 7 does not remove that limitation or
claim a new full accessibility/security audit. Step 8's video evidence, including
CRUD requirement 5.4, is still pending.
