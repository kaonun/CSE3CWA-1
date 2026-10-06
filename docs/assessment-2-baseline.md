# Assessment 2 baseline inspection

Inspected on 7 October 2026. This record covers the inherited application before
backend or database implementation.

## Scaffold requirement

Instruction 1 requires a project originating from the Next.js starter workflow.
The existing repository already satisfies that foundation:

- Initial commit: `02f544dac2c96d60fddab38b445df1ccab85f2f9`,
  `chore: scaffold next.js app`.
- Its commit body explicitly records bootstrapping with `create-next-app`, using
  App Router, JavaScript, CSS Modules, a `src/` directory, and npm.
- The original tree contains the starter configuration, dependency lockfile,
  App Router layout/page, and Next.js starter assets.
- The Assessment 1 technical specification records `npx create-next-app .`.

Assessment 2 continues from `2c68514a4c5f7ac507d63fdee23f6891e27e0404`, the final
Assessment 1 commit. The `assessment-2` branch retains that full history and has
its own working copy in the `Assignment 2` folder. The `Assignment 1` working
copy and remote `master` branch remain the submitted baseline.

There is no need to rerun the starter. Instruction 1's requirement to extend the
app with backend, database, and API functionality remains work for later
increments; only the scaffold and baseline verification are complete here.

## Code inspection

| Area | Current implementation | Consequence for Assessment 2 |
| --- | --- | --- |
| Runtime | Next.js 16.3.0, React 19.2.8, JavaScript, App Router | Extend the existing app and retain its interface. |
| Server rendering | `src/app/layout.js` and the Settings page read the theme cookie on the server | Server execution already exists, but activity APIs and persistence do not. |
| Phoneme inventory | `src/data/phonemes.js` defines 43 symbols and lookup helpers | Preserve each symbol as a complete token; validate incoming tokens against the inventory. |
| Wordle builder | `src/app/wordle/page.js` keeps an answer token array, English word, hint toggle, and 3–8 guesses in React state | These fields must survive saving/loading; the current builder handles a single answer. |
| Word Search builder | `src/app/wordsearch/page.js` keeps token-array words, grid size 6–15, and easy/hard difficulty in React state | Replace the fixed starter list as the content source with saved lists and support multiple configurations. |
| Word management | `WordList.jsx` adds/removes words by array position; there are no stored IDs or edit operation | Introduce stable identity and explicit editing when integrating database CRUD. |
| Game logic | `src/lib/wordle/scoring.js` scores token arrays; `src/lib/wordsearch/generate.js` places token arrays into grid cells | Storage and API responses must preserve token order and multi-character symbols. |
| HTML export | `src/lib/export/buildHtml.js` accepts activity configuration and theme; templates embed their own runtime | Feed the existing export boundary with saved data while preserving offline student activities. |
| Word Search output | The exporter uses the preview's generated grid and placements | Keep the downloaded puzzle consistent with what the teacher previewed. |
| Persistence | Theme cookie only; no activity `fetch` calls, database, ORM, or route handlers | The data layer, API boundary, loading states, and server error handling must be added. |

Example: `['tʃ', 'eː']` contains two phonemes. A database round trip must return
those same two ordered values, without splitting either symbol into characters.

## Integration concerns to address in later increments

- Input validation currently comes mainly from the phoneme keyboard, disabled
  buttons, and numeric controls. Server requests will need independent validation
  of types, ranges, empty lists, unknown tokens, and activity-specific fields.
- `hintFor` assumes every token exists in the inventory. Invalid stored or API
  data must produce a clear error before reaching this helper.
- Word Search `foundIndices` and selection state persist when the grid/placements
  props change. Loading or editing a configuration must reset that game state;
  stale indices could refer to a different word or an absent placement.
- The generator reports words it cannot place, but the current export button can
  still download the partial puzzle. Saved-data generation needs an explicit
  response to incomplete placement.
- Wordle's hint toggle controls inventory tooltips; it is not a custom word-hint
  field. The data design must make any additional hint metadata explicit.
- The current Wordle game uses one answer. Supporting multiple stored lists or
  activity sets requires a clear way to select an answer from saved content.
- Keep `safeJsonForScript` when embedding teacher-entered text in HTML exports.
  Database storage does not replace safe output serialization.
- The About page and historical design document still describe Assessment 1.
  Update application-facing scope and demonstration content alongside the
  relevant functionality.

These are inspection findings and integration requirements, not implemented
backend features or results of a full browser regression test.

## Verification

Environment: Windows, Node.js `v24.19.0`, npm `11.17.0`.

The original Assessment 1 checkout passed:

- `npm run lint` with no reported errors or warnings.
- `npm run build`, producing all five existing application pages.
- Production HTTP checks for `/`, `/wordle`, `/wordsearch`, `/about`, and
  `/settings`: each returned `200 OK` and HTML containing application content.
- A production request with `theme=dark`: the rendered HTML contained
  `data-theme="dark"`.

The independent Assessment 2 checkout also passed:

- `npm ci --no-audit --no-fund` using the inherited lockfile (339 packages).
- `npm run lint` and `npm run build`.
- The same five production HTTP checks and server-rendered dark-theme check.

Installation on this Windows machine required Node's `--use-system-ca` option
to trust the registry certificate through the Windows certificate store. This
was applied only to the installation process; TLS verification stayed enabled,
and no dependency versions or lockfile entries were changed. npm reported an
unapproved `unrs-resolver` install script; no blanket script approval
was granted, and lint/build succeeded with the installed packages.

This baseline check does not claim database persistence, working activity APIs,
`/health`, Docker support, or a fresh interactive/offline-export regression pass.
Those checks belong to the increments that introduce or integrate that behavior.

## Planned increments

The instruction numbers are requirements, rather than a strict implementation
order. Database structure needs to be settled before reliable activity CRUD can
be implemented. Validation should accompany each write path from its first use.

| Increment | Scope | Verification before commit and push |
| --- | --- | --- |
| 1 — baseline | Confirm starter provenance, inspect Assessment 1, prepare the continuation branch | Install locked dependencies, lint, build, and smoke-check the existing production routes. |
| 2 — backend design and entry point | Document the data model/API contract based on this inspection; introduce the required `/health` route | Review coverage of word lists, phoneme order, activity settings, and output metadata; verify `/health` returns `200 OK`. |
| 3 — database foundation | Choose and configure the database/ORM, add schema and migrations, establish persistence | Create a database from migrations and prove ordered multi-character tokens survive a round trip and restart. |
| 4 — validated CRUD | Implement word/list/configuration APIs with validation and consistent errors | Exercise create, read, update, delete, invalid input, missing records, and relevant relationship constraints. |
| 5 — builder integration | Connect both builders to saved content and configurations | Save, reload, edit, and delete through the UI; check error states and preview resets. |
| 6 — saved-data outputs | Generate both downloadable activity types using retrieved data | Verify saved settings and words in both outputs, matching preview content, and offline play. |
| 7 — Docker | Add reproducible container startup and persistent database storage, aligned with the relevant lab | Build and run the container, check `/health`, and prove data survives container recreation. |
| 8 — submission preparation | Update documentation, prepare demonstration checklist and submission archive | Check brief coverage, repository link, video requirements, and exclusion of `node_modules`, secrets, and build output. |

Each increment ends with its own verification, focused commit, push, and report.
Database provider and relationship design are not selected in this baseline
increment. The relevant Docker lab example is not present in the attached folders;
consult it when preparing the container increment.
