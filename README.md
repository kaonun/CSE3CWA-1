# Phoneme'le

Phoneme'le is a frontend-only activity builder for Speech Pathology teachers. It uses an Australian English phoneme keyboard to create playable Wordle and Word Search activities, preview them in the browser, and export them as single offline HTML files for students.

This project was created for CSE3CWA Assessment 1 by **Ali Mhanna (22550592)**.

## Features

- Australian English inventory of 24 consonants and 19 vowels.
- Phonemes are selected from an on-screen keyboard, so users never need to type IPA.
- Hover and keyboard-focus hints such as “TH as in thin” and “TH as in this”.
- Playable Wordle preview with duplicate-aware two-pass scoring.
- Word Search generation with configurable size and easy/hard placement rules.
- One-click export to self-contained, offline `.html` activities.
- Cookie-persisted light/dark theme with system-preference fallback.
- Responsive layouts, visible focus styles, live status announcements, and non-colour-only game states.

## Technology

- Next.js 16 App Router
- React 19
- JavaScript
- CSS Modules and global CSS custom properties
- ESLint
- npm

There is no backend, database, Tailwind CSS, external font, or runtime API dependency.

## Getting started

### Requirements

- Node.js 20.9 or newer
- npm
- A modern browser

### Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The development server uses hot reload, so saved changes appear automatically.

### Quality checks

```bash
npm run lint
npm run build
```

To run the production build locally:

```bash
npm run start
```

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
| `/about` | Project scope, tool descriptions, author details, and video slot |
| `/settings` | Cookie-persisted light/dark theme control |

## Project structure

```text
src/
├── app/                 # App Router pages and global layout/styles
├── components/          # Layout, builder, phoneme, Wordle, and Word Search UI
├── data/phonemes.js     # Single source of truth for the phoneme inventory
└── lib/
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

This is CSE3CWA Assessment 1 and is intentionally frontend-only. The phoneme inventory and starter Word Search list are fixed local data; there is no database, account system, or dynamic word-list service. The About page currently shows a video placeholder until the unlisted walkthrough video is recorded and linked.

Repository: [github.com/kaonun/CSE3CWA-1](https://github.com/kaonun/CSE3CWA-1)
