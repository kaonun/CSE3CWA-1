# CSE3CWA Assessment 1 — Technical Specification

> Assessment 2 context: this branch continues the existing app. Read
> `Assignment2Specs.md` and `docs/assessment-2-baseline.md` for the current scope
> and progress. The specification below describes the Assessment 1 baseline;
> its frontend-only scope, fixed-word-list restriction, and zero-additional-runtime-
> dependency decision do not restrict the backend/database work required for
> Assessment 2. Retain the phoneme-token representation, reusable components,
> accessibility, and standalone HTML export requirements as the app grows.

**Project:** Phoneme'le — a builder for phoneme-based classroom activities
**Audience:** Speech Pathology teachers preparing activities for students
**Scope:** Frontend only. No database, no dynamic word lists (Assessment 2).

> Feed this file to Claude Code as project context (e.g. save it as `CLAUDE.md` at the repo root, or `docs/SPEC.md` and reference it). Update it as decisions change — it should stay the source of truth, not a historical artifact.

---

## 1. Stack decisions

| Decision | Choice | Why (use these in the video) |
|---|---|---|
| Scaffold | `npx create-next-app .` | Mandated by the brief. |
| Router | **App Router** | Server-side cookie reads for theme without a flash of wrong theme; nested layouts give one shared header/nav/footer for free. |
| Language | **JavaScript** | Lower friction for a 5-page app. TypeScript is defensible if you're comfortable — say why either way. |
| Styling | **CSS Modules + CSS custom properties** | Theme switching is a variable swap on `<html>`. No extra dependency to justify. Tailwind is fine if you prefer it, but then theming is `class="dark"` + `dark:` variants. |
| State | React `useState` / `useContext` only | No Redux/Zustand for this scope; adding one is a red flag under "trade-offs". |
| Dependencies | **Zero runtime dependencies beyond Next/React** | The export must be self-contained; keeping the builder lean too makes the "no build step in output" argument coherent. |

**Do not install a UI component library.** The rubric marks component structure — a library hides the thing being assessed.

---

## 2. The critical architectural constraint

The brief requires the output to be **a single `.html` file that runs in a normal web browser**. React cannot do this without either a build step (multiple files) or CDN script tags plus in-browser Babel (needs network, dies on a locked-down school machine).

**Therefore:** the exported file is plain HTML + CSS + vanilla JS, produced by string-building functions. The game logic is written twice — once as React components for the in-app preview, once as vanilla JS in the export template.

This duplication is deliberate and you must be able to defend it. The mitigation is that **the phoneme data and the pure logic functions are shared** — they're plain JS with no React in them, imported by the React preview and serialised into the export. Only the rendering layer is duplicated.

---

## 3. The phoneme data model — build this first

Everything consumes this: the builder's phoneme picker, hover hints, the preview, and the exported keyboard. One file, one export, no duplicated IPA tables anywhere else in the codebase.

### 3.1 Tokenisation — the bug that will bite you

**A phoneme word is an array of tokens, never a string.**

```js
// RIGHT
const word = ["θ", "ɪ", "ŋ"];        // "thing"
const word = ["tʃ", "eː"];           // "chair"

// WRONG — silently breaks on multi-character symbols
"tʃeː".split("")                     // ["t","ʃ","e","ː"] — 4 tiles instead of 2
```

Many IPA symbols are two or three JS characters: `tʃ dʒ iː ɐː ɜː ʉː oː æɪ æɔ ɔɪ əʉ ɑe ɪə eː`. Any code that does `.split("")`, `.length`, or `word[i]` on a raw phoneme string is wrong. Type the data as `string[]` from the start and the problem never appears.

Teachers build the word by **clicking phoneme buttons**, not typing — this also sidesteps IPA keyboard-entry entirely, which is a genuine usability win worth naming in the video.

### 3.2 Shape

```js
// src/data/phonemes.js
export const PHONEMES = [
  { symbol: "θ", label: "TH", example: "thin",  type: "consonant", group: "fricative" },
  // ...
];
```

- `symbol` — the IPA character(s), used as the token value
- `label` — the button label the teacher sees (per the brief: button reads `TH`)
- `example` — drives the hover hint: **"TH as in thin"**
- `type` / `group` — for laying the keyboard out in rows like the figure

### 3.3 Inventory (Australian English)

The figure uses the Australian English inventory (Cox & Fletcher / HCE conventions), which is what Australian speech pathology programs teach. **Verify this against your subject materials before locking it in** — transcription conventions vary between courses, and getting it wrong is a content error a marker in this field will spot immediately.

**Consonants (24)**

| Symbol | Label | Example | Group |
|---|---|---|---|
| p | P | pig | plosive |
| b | B | bed | plosive |
| t | T | top | plosive |
| d | D | dog | plosive |
| k | K | cat | plosive |
| g | G | goat | plosive |
| m | M | man | nasal |
| n | N | nose | nasal |
| ŋ | NG | sing | nasal |
| f | F | fish | fricative |
| v | V | van | fricative |
| θ | TH | thin | fricative |
| ð | TH | this | fricative |
| s | S | sun | fricative |
| z | Z | zoo | fricative |
| ʃ | SH | shop | fricative |
| ʒ | ZH | measure | fricative |
| h | H | hat | fricative |
| tʃ | CH | chair | affricate |
| dʒ | J | jam | affricate |
| l | L | leg | approximant |
| ɹ | R | red | approximant |
| w | W | wet | approximant |
| j | Y | yes | approximant |

> `θ` and `ð` share the label **TH**. The hover hint is what disambiguates them ("TH as in thin" vs "TH as in this") — a concrete example of why the hint requirement exists, and a good video talking point.

**Vowels (19)**

| Symbol | Label | Example | Group |
|---|---|---|---|
| iː | EE | bee | long |
| ɪ | I | sit | short |
| e | E | bed | short |
| eː | AIR | square | long |
| æ | A | cat | short |
| ɐ | U | cup | short |
| ɐː | AR | car | long |
| ɜː | ER | bird | long |
| ʉː | OO | boot | long |
| ɔ | O | hot | short |
| oː | OR | north | long |
| ʊ | U | put | short |
| ə | UH | about | short |
| æɪ | AY | face | diphthong |
| æɔ | OW | mouth | diphthong |
| ɔɪ | OY | boy | diphthong |
| əʉ | OH | goat | diphthong |
| ɑe | IE | high | diphthong |
| ɪə | EAR | near | diphthong |

### 3.4 Helpers (same file)

```js
export const bySymbol = (sym) => PHONEMES.find(p => p.symbol === sym);
export const hintFor  = (sym) => { const p = bySymbol(sym); return `${p.label} as in ${p.example}`; };
export const KEYBOARD_ROWS = [ /* arrays of symbols, matching the figure's layout */ ];
```

---

## 4. Directory structure

```
src/
  app/
    layout.js              # <html>, theme from cookie, Header/Nav/Footer
    page.js                # Home
    about/page.js
    wordle/page.js
    wordsearch/page.js
    settings/page.js
    globals.css            # CSS custom properties, :root and [data-theme="dark"]
  components/
    layout/
      Header.jsx
      NavBar.jsx           # tab bar + hamburger trigger
      HamburgerMenu.jsx    # About, Settings
      Footer.jsx           # name + student number
    phoneme/
      PhonemeButton.jsx    # label + hover hint, one button
      PhonemeKeyboard.jsx  # grid of PhonemeButton, rows from KEYBOARD_ROWS
      PhonemeWordDisplay.jsx
    builder/
      BuilderLayout.jsx    # shared two-pane shell: controls left, preview right
      GenerateButton.jsx   # triggers download
      SettingsField.jsx    # labelled control wrapper
    wordle/
      WordleGrid.jsx
      WordleRow.jsx
      WordleTile.jsx
    wordsearch/
      WordSearchGrid.jsx
      WordList.jsx
    ui/
      Toggle.jsx
      NumberInput.jsx
      Card.jsx
  lib/
    wordle/
      scoring.js           # pure — shared with export
    wordsearch/
      generate.js          # pure — shared with export
    export/
      buildHtml.js         # top-level composer
      styles.js            # returns CSS string
      wordleTemplate.js    # returns markup + script for wordle
      wordsearchTemplate.js
      download.js          # Blob + object URL + click
    theme.js               # cookie read/write
  data/
    phonemes.js
```

**Rule:** nothing in `lib/` imports from `components/` or from `react`. That's what keeps the shared logic shareable.

---

## 5. Pages

### Home (`/`)
Brief introduction to the project, and links to the other pages. Keep it short — it's a landing page, not documentation.

### About (`/about`)
- What the project is
- **Explicit statement that Assessment 1 is frontend only**
- Short description of the Wordle and Word Search tools
- **Your name and student number**
- **Embedded how-to video** (the brief requires it on this page — an `<iframe>` to an unlisted YouTube video is fine; a local `<video>` file bloats the zip)

### Wordle (`/wordle`)
Per the figure, controls are:
- **Phoneme Word** — built by clicking the phoneme keyboard, shown as removable chips with a backspace/clear. Not a text field.
- **English Word** — plain text input (the equivalence revealed on success)
- **Show hints** — Yes/No toggle
- **Number of Guesses** — number input, sensible range (3–8, default 6)
- **Generate** button (top-right, per the figure)
- Live preview pane

### Word Search (`/wordsearch`)
- A fixed list of ~5 phoneme words (the brief permits fixed at this stage — but build the list as editable state anyway; it's near-free and sets up Assessment 2)
- Grid size control
- Difficulty (controls whether diagonals/reversals are used)
- Generate + preview

### Settings (`/settings`)
- Light/dark theme — **persisted in a cookie** (explicitly required; localStorage does not satisfy the brief)
- Optional layout preferences (e.g. compact/comfortable spacing, or preview pane position)

---

## 6. Theme and cookies

Required: theme stored in cookies. The App Router makes this clean and avoids a flash of the wrong theme on load:

1. Server component `app/layout.js` reads the cookie with `cookies()` from `next/headers`
2. Sets `<html data-theme={theme}>` in the server-rendered output
3. `globals.css` defines custom properties under `:root` and `[data-theme="dark"]`
4. The settings toggle is a client component that writes `document.cookie` and updates the attribute immediately, then optionally `router.refresh()`

Cookie: `theme=light|dark`, `path=/`, `max-age=31536000`, `SameSite=Lax`.

**Also honour `prefers-color-scheme`** as the default when no cookie is set — a small accessibility win that's cheap to implement and good to mention.

---

## 7. Wordle logic (`lib/wordle/scoring.js`)

Pure functions, no React, no DOM.

```js
// guess: string[], answer: string[]  →  ("correct"|"present"|"absent")[]
export function scoreGuess(guess, answer) { ... }
```

**Two-pass algorithm — do not shortcut this.** The naive one-pass version mis-scores repeated phonemes:

1. **Pass 1:** mark exact positional matches as `correct`; record which answer positions are consumed
2. **Pass 2:** for each remaining guess token, mark `present` only if an *unconsumed* matching token remains in the answer, then consume it; otherwise `absent`

Also needed:
- `isWin(scores)` — all `correct`
- Guess validation: length must equal answer length
- On win **or** on exhausting guesses, reveal the English equivalence (brief requires clear display on correct)

The teacher's chosen guess count is passed through to the export.

---

## 8. Word search generation (`lib/wordsearch/generate.js`)

```js
// words: string[][], size: number, opts: {diagonals, reversals}
// → { grid: string[][], placements: [...] }
export function generateWordSearch(words, size, opts) { ... }
```

- Each **cell holds one phoneme token**, not one letter. Cells are therefore variable-width content — use a fixed square cell with centred text sized for the widest token (`æɔ`), or the grid will look ragged.
- Placement: shuffle words longest-first, try random positions and permitted directions, backtrack on collision, cap attempts and report any word that couldn't be placed rather than failing silently.
- Fill empty cells with random phonemes from the same inventory (not random letters — it must stay phoneme-consistent).
- Directions: horizontal + vertical always; diagonals and reversals gated by difficulty.

---

## 9. HTML export (`lib/export/`)

```js
buildHtml({ type, config })  // → complete HTML document string
```

Composed from smaller builders so Word Search reuses the shell:

- `documentShell({ title, styles, body, script })` — doctype, meta viewport, `<style>`, `<body>`, `<script>`
- `styles()` — all CSS inlined; includes its own light/dark handling via `prefers-color-scheme`
- `wordleTemplate(config)` — markup for grid + keyboard, plus a `<script>` containing the game logic and the config serialised as a JS object literal
- `wordsearchTemplate(config)` — same pattern

**Requirements to hold to:**
- No external requests. No CDN, no Google Fonts, no fetch. System font stack only.
- The phoneme data needed by the export is serialised inline via `JSON.stringify`, not imported.
- The exported page must reflect the teacher's settings (word, guess count, hints on/off) — this is explicitly marked.
- Hover hints in the export use `title` attributes **and** a visible tooltip element, because `title` isn't reliably accessible.
- **Escape anything the teacher typed** before interpolating it into the template. The English word goes into markup — an unescaped `<` breaks the file. Write one `escapeHtml()` helper and use it every time.

`download.js`: build a `Blob` with type `text/html`, `URL.createObjectURL`, create an `<a download="phonemele-wordle.html">`, click, then **revoke the object URL**.

---

## 10. Accessibility (directly marked — build it in, don't retrofit)

- Semantic landmarks: `<header> <nav> <main> <footer>`
- Every control has a real `<label>` (or `aria-label`), not just placeholder text
- **Visible keyboard focus** on every interactive element — never `outline: none` without a replacement
- Phoneme buttons are `<button>` elements, reachable and activatable by keyboard
- Hover hints must **also** appear on keyboard focus, or keyboard users lose the feature entirely — this is the single most likely accessibility gap in this project
- Wordle tile state announced via `aria-label` (e.g. "θ, correct position"), not conveyed by colour alone
- Colour-blind safety: green/yellow/grey is the classic Wordle palette and is poor for deuteranopia. Add a shape/border/icon differentiator, or offer a high-contrast tile scheme. **Do this in the export too.**
- Contrast ≥ 4.5:1 for text in both themes
- Respect `prefers-reduced-motion` for any tile-flip animation
- Hamburger menu: `aria-expanded`, `aria-controls`, closes on `Esc`, focus returns to the trigger

---

## 11. Responsive layout

Breakpoints: single column below ~768px, two-pane (controls | preview) above.

- Tab bar collapses into the hamburger menu on narrow screens; the hamburger holds **About and Settings** at all widths per the brief
- The phoneme keyboard is the hard part — 40+ buttons. Below 768px, let it scroll horizontally within its container or reflow to fewer columns; don't let buttons shrink below a ~44px touch target
- The word search grid should scale via `aspect-ratio` and a container query or `clamp()`-sized cells rather than fixed pixels

---

## 12. Visual direction

The subject's own world is the **phonetic chart** — a dense, gridded reference table that speech pathologists read constantly. Lean into that rather than a generic SaaS dashboard: the phoneme keyboard *is* the hero of this interface, and the design should treat it as the centrepiece rather than a form control tucked below the fold.

Suggested direction (adapt it — the point is that you can justify the choice):
- **Palette:** a cool clinical base (paper white / slate ink) with a single saturated accent used only for active phoneme selection and the Generate action. Avoid warm-cream-plus-terracotta; it's the current AI-design default and reads as templated.
- **Type:** a body face with genuinely good IPA glyph coverage — this constrains you more than usual, since `ʉ ɐ ɹ ʒ` render poorly in many display faces. Test the full inventory in your chosen face before committing. System stacks are safe; Charis SIL / Doulos SIL are designed for phonetic transcription if you want something characterful.
- **Signature element:** the phoneme keyboard rendered as a proper chart — grouped by manner of articulation with quiet section rules, so it reads as a professional reference tool rather than a keypad.
- **Restraint:** spend the boldness there and keep the forms plain.

---

## 13. Build order and commit plan

One commit per step, meaningful messages. This history reads as a story you can narrate on video.

| # | Step | Commit message |
|---|---|---|
| 1 | `npx create-next-app .`, clear boilerplate | `chore: scaffold next.js app` |
| 2 | Phoneme data + helpers | `feat: add phoneme data model and lookup helpers` |
| 3 | Layout shell, nav, hamburger, footer | `feat: add app shell with navigation and footer` |
| 4 | Theme cookie + settings page | `feat: add cookie-persisted light/dark theme` |
| 5 | PhonemeButton + PhonemeKeyboard + hints | `feat: add phoneme keyboard with hover and focus hints` |
| 6 | Wordle builder controls + state | `feat: add wordle builder configuration form` |
| 7 | Wordle scoring logic + preview | `feat: add wordle scoring and live preview` |
| 8 | HTML export for Wordle + download | `feat: export playable wordle as standalone html` |
| 9 | Word search generation | `feat: add word search grid generation` |
| 10 | Word search builder + preview + export | `feat: add word search builder and html export` |
| 11 | Home + About pages, video embed | `feat: add home and about pages` |
| 12 | Responsive passes | `style: responsive layout for tablet and mobile` |
| 13 | Accessibility audit fixes | `fix: keyboard focus hints and aria labels` |
| 14 | README | `docs: add readme` |

Add a `.gitignore` check for `node_modules` before the first push, and confirm the exported `.html` opens correctly **from the file system with the network disconnected** before you call the export done.

---

## 14. Video talking points (6–8 min)

Have an answer ready for each — these map to the brief's stated criteria:

1. **Design decisions** — why App Router, why no UI library, why the two-pane builder layout
2. **Component structure and scalability** — the `lib/` vs `components/` split; how Assessment 2's word list drops into `data/` without touching the render layer
3. **Usability** — clicking phonemes instead of typing IPA; live preview before generating; hints as a teacher-controlled setting
4. **Accessibility** — focus-visible hints, non-colour-only tile state, landmarks, reduced motion
5. **Trade-offs** — the big one is duplicated game logic between React preview and vanilla export, and *why* that beats CDN React (offline, single file, no build step); also fixed word list, and CSS Modules over a component library
6. **Serving Speech Pathology teaching** — phoneme-first rather than spelling-first; the /θ/ vs /ð/ disambiguation via examples; Australian English inventory matching what students are taught
7. **Commits** — walk the history above; it demonstrates incremental development

---

## 15. Verify before submission

- [ ] Exported `.html` runs offline, from disk, in a fresh browser profile
- [ ] Export reflects every setting the teacher chose
- [ ] Keyboard-only run-through of both builders and both exports
- [ ] Both themes pass contrast; theme survives a page reload (cookie, not localStorage)
- [ ] Name and student number in the footer **and** on the About page
- [ ] Video embedded on About
- [ ] `node_modules` not in the zip; repo pushed and public/accessible
- [ ] Phoneme inventory confirmed against subject materials
