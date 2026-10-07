# Step 6: activities generated from stored content

## Scope and workflow

Instructions 6.1–6.3 are implemented: the backend loads saved words/settings,
generates both downloadable activity types, and supports different teacher lists
rather than fixed examples. No schema migration or new dependency is required.
The CRUD implementation was committed first at `4348eac`; its video evidence
(5.4) remains for Step 8.

1. Start the app locally (`npm run dev`, or build then `npm run start`) or in
   Docker using [the Docker guide](docker.md).
2. Open **Library**, create/select a list, save words, then save a Wordle or
   Word Search configuration. Include its title, hints, theme and filename.
3. Use **Open <title> in builder**, or open `/wordle` / `/wordsearch` and select
   a saved configuration. The Library link includes `?activity=<saved-id>` and
   automatically loads that record. Direct builders list saved choices by type
   with Refresh and Load more controls.
4. Test the **Saved activity preview**. Wordle uses the selected answer, its
   English text and optional word hint. Word Search uses every word in the list,
   with complete phoneme tokens occupying individual grid cells.
5. Select **Download saved Wordle** or **Download saved Word Search**. The
   filename and light/dark theme come from the saved configuration, not the
   teacher interface's current theme. The preview game has its own scoped saved
   theme. Download status reports that the browser download was requested.
6. After editing Library content, use **Reload and regenerate** to fetch a new
   snapshot. Word Search produces a new layout. Switching choices/regenerating
   resets player progress; superseded requests are aborted and cannot overwrite
   the current selection. Missing/wrong-type configurations show clear errors
   and cannot be downloaded.

The inherited A1 editors remain under **Temporary ... editor (not saved)** for
experimentation. They use the stateless API and current interface theme; they do
not mutate the Library. The Word Search editor now begins empty, not with five
hard-coded example words. Temporary input resets on refresh. Saved choices made
only in the dropdown are transient; a Library link carries the configuration ID
in the URL for direct reopening.

## Backend contract and snapshot consistency

```text
POST /api/configurations/<saved-id>/generate
Content-Type: application/json

{}
```

No frontend words, settings, theme or filename override is accepted. The handler
uses the existing bounded JSON reader and same-origin checks; invalid requests
produce the same clear error envelope as CRUD. Success is 200 with no-store:

```text
{ data: { filename, html, configuration, preview? } }
```

`configuration` is the saved record plus its ordered `wordList` snapshot;
`preview` is the generated grid/placements/empty failure array for Word Search.
Wordle's preview consumes the selected word and settings from that snapshot.
No SQL paths, credentials or database connection objects reach the browser.

`saved-activities.js` retrieves configuration and list in one transaction via
the existing storage reader/queue, validates the saved settings, and supplies
ordered tokens to the shared `generateActivity` service. Puzzle generation takes
place outside the connection lock against that consistent in-memory snapshot.
Generation is read-only: it neither changes the saved configuration/list nor
persists exported HTML. The browser retains that generated output for download.

The shared generation/export boundary adds:

- Wordle's saved word hint, title, selected answer, guesses and hints toggle.
- Word Search's saved size/difficulty, title, hints toggle, and word IDs/English
  text/custom hints alongside placements. Duplicate token sequences retain
  independent word identities and metadata through a per-sequence queue.
- Safely serialized script data and escaped document titles. Visible teacher
  text is assigned through `textContent`, never interpolated as runtime HTML.
- A 422 response with no partial output if every word cannot be placed after
  five layout attempts. Fitting individual words in a grid does not guarantee
  that the entire list can be placed together.

Preview and download use **the same response**, not two random generation calls.
The cached snapshot remains valid for classroom download even if the teacher
later changes the database. Reload/regenerate is the explicit freshness action;
the source panel shows both list and configuration timestamps. This is not a
live-sync or optimistic-concurrency system.

Downloaded HTML embeds CSS, complete inventory tokens, content/settings and
gameplay JavaScript. It contains no external script/style links, API requests,
or dependency on the teacher server. Wordle supports complete-token input,
duplicate-aware scoring, win/loss and reset. Word Search accepts either endpoint
order and marks each saved placement once. Hints off suppresses Wordle's custom
clue/keyboard tooltips and Word Search's English/hint clues and cell tooltips.
Teacher-side source metadata remains visible to the teacher regardless of the
student hints setting.

The local single-app/authentication limitations in [crud.md](crud.md) still
apply; this change does not authorize public or multi-user deployment.

## Verification on 7 October 2026

- Lint and production build passed with the new saved-generation route.
- All **62 local HTTP checks** passed: 28 inherited normal checks, 19 CRUD groups,
  14 saved-generation/offline-runtime groups, and one owned readiness-failure
  check. Coverage includes both outputs, multiple lists/configurations, ordered
  multi-character/repeated tokens, custom hints, themes/titles/filenames, latest
  saved edits, rejected overrides, missing/deleted IDs, wrong methods, unsafe
  teacher text, read-only concurrent generation, and unplaceable saved puzzles.
- The **22 database checks** still passed without a migration change.
- Linux Docker build/non-root readiness passed; **61 normal HTTP checks** passed
  before and after container replacement on the same disposable volume. Both
  saved activity types also generated from the persistent API-created records
  after replacement; the 22 direct storage checks passed as well.
- Real production-browser checks followed Library links, loaded both saved
  activity types, played Wordle to a win and Word Search to completion, then
  verified regeneration resets progress. Missing and wrong-type IDs displayed
  errors with download unavailable. Saved light/dark preview colors were checked
  independently of interface theme. Mobile/desktop checks reported no page
  overflow (390-pixel and 1280-pixel inner widths).
- Both **actual browser downloads** were found in the normal Downloads folder.
  The Wordle file matched the API-produced fixture byte-for-byte. A SHA-256
  comparison of flattened grid tokens proved the downloaded Word Search used
  the exact grid played in the preview. The in-app download event observer
  timed out, so file existence/content checks supplied the download evidence.
- With the application server stopped, the actual downloaded files passed
  `verify-offline.mjs`: complete-token keyboard, length controls, hints, win/loss,
  reset, grid/word metadata, reversed endpoint selection and completion. The
  same offline-runtime checks also run inside the HTTP suite, including repeated
  Wordle token scoring and hints-off behavior for both activity types.

### Offline verification limitation

The in-app browser **blocks `file:` URLs**, so direct local-file browser play was
not completed and no workaround was attempted. Offline tests execute the
project-generated runtime against a minimal DOM adapter with no server/network
APIs. They verify gameplay, not real browser rendering or accessibility. Node's
VM is not a security sandbox for arbitrary code: run this helper only against
trusted HTML generated by this project. Browser previews and download-content
checks complement those runtime tests but do not replace the manual check below.

Manual check: download each saved activity, stop the teacher app, open the `.html`
file normally in Chrome/Edge (preferably with networking disabled), play a full
Wordle win/loss/reset and find all Word Search words. Include that check in the
Step 8 demonstration. Two disposable sample downloads from this verification
remain as `offline-wordle.html` and `offline-search.html` in Downloads; they are
not real teacher content.

For repeatable checks:

```bash
npm run lint
npm run build
npm run test:backend
npm run test:database
npm run test:docker
node scripts/verify-offline.mjs path/to/generated-wordle.html path/to/generated-search.html
```

The Docker trusted-CA option on this computer remains documented in `docker.md`.
`saved-generation-checks.mjs` removes only lists created by its run. The preview
helper optionally seeds disposable saved content when `PREVIEW_SAVED_FIXTURES=1`;
its `offline` command stops only the owned app server, retains test files until
`stop`, and never accesses teacher storage. Verification removed its temporary
preview databases and labelled Docker volume; the generated test downloads and
updated production image remain available. Video/submission work is not claimed
complete here; Step 7's final validation/error audit is next.
