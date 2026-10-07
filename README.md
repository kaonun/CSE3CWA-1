# Phoneme'le

Phoneme'le is an activity builder for Speech Pathology teachers. It uses an Australian English phoneme keyboard to create playable Wordle and Word Search activities, preview them in the browser, and export them as single offline HTML files for students.

This project was created for CSE3CWA Assessment 1 by **Ali Mhanna (22550592)** and continues into Assessment 2 on `master`. The `assessment-1` branch preserves the complete original submission at `2c68514`. Future assessments will continue on `master`, with completed submissions preserved on assessment branches.

## Assessment 2 progress

The inherited Next.js foundation is verified. Step 2 adds server-side activity generation, an API used by both builders, and `/health`. Step 3 adds a verified Docker production image and Compose startup. Database persistence and CRUD remain later assessment steps. The course Dockerfile has not been supplied, so its exact lab-specific structure has not yet been compared.

- [Assessment 2 specification](Assignment2Specs.md)
- [Baseline inspection, verification, and increment plan](docs/assessment-2-baseline.md)
- [Step 2 backend architecture, API contract, and verification](docs/backend.md)
- [Step 3 Docker setup, local certificate trust, and verification](docs/docker.md)

The original scaffold commit, `02f544d`, records creation with `create-next-app`. Assessment 2 continues that application and its Git history; running the starter again is unnecessary.

## Features

- Australian English inventory of 24 consonants and 19 vowels.
- Phonemes are selected as visible IPA symbols from an on-screen keyboard, so users never need to type IPA.
- Hover and keyboard-focus hints such as "TH (as in thin)" and "TH (as in this)".
- Playable Wordle preview with duplicate-aware two-pass scoring.
- Word Search generation with configurable size and easy/hard placement rules.
- One-click export to self-contained, offline `.html` activities.
- Generated activities retain the teacher's active light or dark theme.
- Cookie-persisted light/dark theme with system-preference fallback.
- Responsive layouts, visible focus styles, live status announcements, and non-colour-only game states.

## Technology

- Next.js 16 App Router
- React 19
- JavaScript
- CSS Modules and global CSS custom properties
- ESLint
- npm
- Docker multi-stage production build and Compose

Next.js Route Handlers provide the backend in the same application. The builders require the running server; downloaded student activities remain self-contained. There is currently no database or additional runtime dependency beyond Next.js and React.

## Getting started

### Requirements

- Node.js 20.9 or newer
- npm
- A modern browser

### Run locally

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The development server uses hot reload, so saved changes appear automatically.

### Quality checks

```bash
npm run lint
npm run build
npm run test:backend
```

To run the production build locally:

```bash
npm run start
```

### Run in Docker

With Docker Desktop running Linux containers:

```bash
docker compose up --build -d --wait
```

Open [http://localhost:3000](http://localhost:3000). Stop the service with
`docker compose down`. The image installs locked dependencies, builds the app,
and runs its standalone production server as a non-root user. Its health check
calls `/health`.

Run `npm run test:docker` to build and check a temporary container. On this
computer, Norton HTTPS scanning requires an optional build-only trusted CA;
see [the certificate instructions](docs/docker.md#tls-scanning-networks-optional)
before a clean Docker build. TLS verification remains enabled.

## Using the application

### Wordle

1. Open `/wordle`.
2. Click phonemes to build the answer.
3. Optionally enter the English word, toggle player hints, and choose 3–8 guesses.
4. Test the activity in the live preview.
5. Select **Generate** to download `phonemele-wordle.html`.

The exported game contains its own styles, phoneme data, keyboard, scoring logic, and JavaScript. It does not require this Next.js application to be running.

### Word Search

1. Open `/wordsearch`.
2. Build words with the phoneme keyboard and add them to the word list.
3. Choose a grid size from 6–15.
4. Choose **Easy** for horizontal/vertical words or **Hard** to also allow diagonals and reversals.
5. Test the generated puzzle by selecting each word's start and end cells.
6. Select **Generate** to download `phonemele-wordsearch.html`.

The exact grid shown in the preview is embedded in the exported file, so students receive the same puzzle the teacher tested.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Project landing page |
| `/wordle` | Wordle builder, preview, and export |
| `/wordsearch` | Word Search builder, preview, and export |
| `/about` | Project scope, tool descriptions, author details, and walkthrough video |
| `/settings` | Cookie-persisted light/dark theme control |
| `/health` | Application liveness, returning JSON and `200 OK` |
| `/api/activities/generate` | POST validated Wordle/Word Search settings for server-generated activity output |

## Project structure

```text
src/
├── app/                 # App Router pages and global layout/styles
├── components/          # Layout, builder, phoneme, Wordle, and Word Search UI
├── data/phonemes.js     # Single source of truth for the phoneme inventory
└── lib/
    ├── api/             # Browser API client
    ├── server/          # Server-only request handling and activity service
    ├── export/          # Standalone HTML document, styles, and activity templates
    ├── wordle/          # Two-pass Wordle scoring
    ├── wordsearch/      # Grid generation and placement
    └── theme.js         # Theme cookie helpers
```

## Key design decisions

- A phoneme word is stored as an array of symbol tokens, not as a string. This preserves multi-character symbols such as `tʃ`, `eː`, and `æɪ`.
- Wordle scoring first marks exact-position matches, then scores remaining tokens against unconsumed answer tokens. This prevents repeated phonemes from being over-counted.
- Word Search placement allows overlap only where both words contain the same phoneme token in the same cell.
- Exported activities are plain HTML, CSS, and vanilla JavaScript. The Wordle export intentionally reproduces the interactive logic without React; the Word Search export embeds the already-generated preview grid.
- Teacher-entered text embedded in export scripts is safely serialized to prevent a literal `</script>` payload from escaping the script context.

## Accessibility and responsive design

- Semantic `header`, `nav`, `main`, and `footer` landmarks.
- Keyboard-operable controls with visible `:focus-visible` outlines.
- Phoneme hints appear on both hover and keyboard focus.
- Dynamic game status uses polite live regions.
- Wordle tile states combine colour, icons, border styles, and descriptive labels.
- Audited text/background combinations meet WCAG AA contrast requirements.
- Builders collapse from two panes to one on smaller screens; large word-search grids use contained horizontal scrolling rather than overflowing the page.

## Assessment scope

Step 2's backend supports the inherited frontend, and Step 3 runs it in Docker. Both builders use the activity-generation API; Word Search previews and exports share the same server-generated puzzle. Teacher content is not yet persisted and is lost on refresh. The phoneme inventory and starter list remain local reference/default data until database integration. The About page identifies the existing walkthrough as the Assessment 1 video.

Current development: [master](https://github.com/kaonun/CSE3CWA-1/tree/master). Original submission: [assessment-1](https://github.com/kaonun/CSE3CWA-1/tree/assessment-1).
