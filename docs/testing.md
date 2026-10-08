# Testing and troubleshooting

Use Node.js 24 and install the locked dependencies with `npm ci`.

## Local quality gate

```sh
npm run check
```

The command stops on the first failed stage:

1. ESLint checks application and verification code.
2. Next.js builds standalone production output and browser assets.
3. Client-error checks mock failed/malformed responses, cancellation and timeouts;
   they verify readable messages and no automatic write retries.
4. UI-behavior checks exercise component tooltip event state, teacher-summary
   markup, Library deep links and retained configuration-save workflows. These
   are not browser layout or real pointer/focus checks.
5. Database checks migrate an empty temporary database, exercise constraints,
   then restart in a fresh process and verify ordered data/persistence.
6. HTTP checks start an isolated production server with disposable SQLite storage,
   exercising pages/assets, health and metrics outputs, live telemetry, CRUD,
   pagination, validation, concurrent writes, saved generation, export safety
   and offline runtime gameplay.
7. Playwright starts another production server with a fresh temporary database.
   Chromium performs teacher list/word/configuration CRUD and a student workflow
   that loads, solves and downloads a saved Wordle.

Individual commands are `npm run lint`, `npm run build`,
`npm run test:client-errors`, `npm run test:ui-behavior`, `npm run test:database`
and `npm run test:backend`.
Install Playwright's pinned browser once with `npx playwright install chromium`.
`npm run test:e2e` builds first; `test:e2e:built` reuses the current build.
Build before running the backend checks. `npm run start` also requires a build
and reports that requirement before creating/migrating storage when files are absent.

The default tests do not write to `data/phonemele.db` or use port 3000. Their
temporary storage is validated before cleanup. Deliberately damaged-data and
readiness fixtures run only against the backend suite's private database.
Never point a fixture writer at teacher storage.

## JMeter load testing

The CLI-only JMeter workflow is separate from `check` because it intentionally
loads a running server. Apache JMeter 5.6.3 is required. `npm run test:load`
runs one smoke user; `npm run test:load:staged` runs the safe local 1/10/25/50/100
profile. The explicit `test:load:full` command enables the 1/10/100/1,000/10,000
profile and must only be used on appropriately sized or distributed injectors.

The runner rejects non-loopback targets, requires a separate high-load flag for
stages above 100, and writes ignored JTL/log/HTML artifacts under
`jmeter/results/`. See the [JMeter commands](../jmeter/README.md).

## Docker quality gate

```sh
npm run test:docker
```

Requires the Linux engine and Compose. It builds the image, checks its non-root
runtime/readiness, and runs normal HTTP checks before and after replacing the
container on the same owned volume. Direct storage fixtures and API-created
records verify persistence and generation after replacement. The verifier checks
that no host database, fixture writer or build-only CA is shipped. Cleanup
removes only its own container and labelled volume.

See [Docker setup](docker.md) for optional build-only trust on TLS-scanning networks.
On Windows, Node's `--use-system-ca` option can use an already trusted Windows
certificate store for local npm installation; do not disable TLS verification.

## Optional existing test target

```powershell
$env:TEST_BASE_URL = 'http://127.0.0.1:3000'
npm run test:backend
Remove-Item Env:TEST_BASE_URL
```

This explicitly targets an existing loopback app. It creates and deletes only
lists owned by that run, but **does mutate the selected database**. Prefer the
default isolated mode; do not use this while demonstrating or editing teacher
content. The private damaged-data/readiness fixtures are skipped in this mode.

## Interactive browser checks

```sh
node scripts/preview-verification.mjs
```

The helper prints an ephemeral URL backed by a temporary database. Keep its
terminal open and enter `stop` to stop it and remove only its disposable data.
Use that URL to test forms, errors, reload persistence, keyboard interactions,
saved previews/downloads, and narrow/wide layouts without touching teacher data.
Check phoneme hints with mouse and keyboard: hovering or tabbing onto a key
shows its hint, activation/Escape dismisses it without losing focus, moving away
after a click leaves no lingering hint, and returning to/focusing the key shows
it again. Download a fresh Wordle HTML file to check the same behavior offline.
From each saved builder, use its Library edit link and confirm the matching list
and configuration open at the editor. Save, then make a further edit: the editor
should remain open, the inline Saved confirmation should clear, and a second save
should update the same record. Configurations should not reorder after saves.

Set `PREVIEW_SAVED_FIXTURES=1` before starting the helper to seed disposable
configurations for both games. It prints configuration links, export paths and
search placements. Enter `offline` to stop only the server while retaining test
exports; enter `stop` afterward for cleanup. These fixtures are not normal app seeds.

## Offline exports

In a normal browser, download both saved activity types, stop the app, open the
HTML files directly, and play through each game. Check hints/theme/title,
multi-character tokens, Wordle win/loss/reset and Word Search completion.

```sh
node scripts/verify-offline.mjs path/to/wordle.html path/to/search.html
```

Use only trusted, project-generated files. This executes their scripts with a
minimal DOM adapter and no supplied server/network APIs. Node's VM is not a
security sandbox for arbitrary files. The automated test checks game logic, not
browser rendering or accessibility. The in-app browser blocks `file:` URLs, so
direct local-file browser play remains a manual check, not a claimed automated pass.

## Lighthouse accessibility checks

Start the local application, then run the four-route accessibility audit in a
second terminal:

```sh
npm run dev
npm run test:accessibility
```

The command writes viewable HTML reports and machine-readable JSON/CSV summaries
to `lighthouse/results/<timestamp>/`. These generated reports are intentionally
ignored by Git.

## Maintenance checks

- Start from a fresh source copy without `node_modules`, `.next`, local data or
  environment files. Run `npm ci`, then both quality gates.
- On a fresh copy, `npm run start` before a build should fail clearly without
  creating teacher storage. After building, startup should migrate successfully.
- Keep schema changes as new reviewed migrations. Check existing-data upgrades
  on a backup copy, not by rewriting an applied migration.
- Preserve the separation between browser clients, thin routes, server-only
  storage/generation, and reusable token/game/export logic.
- Recheck dependency/runtime updates deliberately; lockfile and Docker digest
  changes are part of reproducibility, not incidental formatting.
- Run `npm audit --omit=dev` for runtime dependency advisories and `npm audit`
  for development/build tools as well. Review compatible fixes, commit the updated
  lockfile and rerun both quality gates; do not use forced upgrades or treat a clean
  runtime audit as a complete security review. Keep tooling on trusted source and
  do not expose development, migration or database inspection servers publicly.

## Common failures

- Port 3000 occupied: stop the other dev/Compose server, or select another port.
- Missing production output: run `npm run build` before `npm run start`.
- Database 503: inspect server logs, intended path, permissions and migration
  status. Restore or deliberately repair damaged data; do not erase storage.
- Timed-out save: reload stored content to see whether it succeeded before retrying.
- Search placement 422: retry or increase grid size/reduce word count or length.
- Old saved preview: use **Reload and regenerate**; changing Library records does
  not silently replace an already downloaded/generated snapshot.

Public/multi-user hosting is outside the current local deployment model. It needs
authentication, authorization, trusted proxies, backup/version policy and a
database appropriate to its scale. Automated checks are not a full security audit.
