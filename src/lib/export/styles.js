export function styles() {
  return `
:root {
  --color-bg: #f6f7f8;
  --color-surface: #ffffff;
  --color-surface-muted: #eceef1;
  --color-ink: #1b2130;
  --color-ink-muted: #565f73;
  --color-border: #d7dbe2;
  --color-accent: #2558c4;
  --color-accent-ink: #ffffff;
  --color-focus: #2558c4;
  --color-correct-bg: #1a7a4c;
  --color-correct-ink: #ffffff;
  --color-present-bg: #f0b429;
  --color-present-ink: #1b2130;
  --color-absent-bg: #eceef1;
  --color-absent-ink: #565f73;
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", Arial, sans-serif;
  --radius-sm: 4px;
  --radius-md: 8px;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #12151c;
    --color-surface: #1a1e28;
    --color-surface-muted: #232838;
    --color-ink: #e8eaef;
    --color-ink-muted: #a7adbd;
    --color-border: #2d3241;
    --color-accent: #6d9bff;
    --color-accent-ink: #0b1220;
    --color-focus: #6d9bff;
    --color-correct-bg: #2fa968;
    --color-correct-ink: #0b1220;
    --color-present-bg: #d99a1f;
    --color-present-ink: #0b1220;
    --color-absent-bg: #232838;
    --color-absent-ink: #a7adbd;
    color-scheme: dark;
  }
}

* { box-sizing: border-box; }
html, body { padding: 0; margin: 0; }
body {
  background: var(--color-bg);
  color: var(--color-ink);
  font-family: var(--font-sans);
  line-height: 1.5;
}
main {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 2px; }
[hidden] { display: none !important; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}

.page-header {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}
.eyebrow {
  margin: 0 0 var(--space-1);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}
.page-header h1 { margin: 0; font-size: 1.5rem; }
.page-footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
  color: var(--color-ink-muted);
  font-size: 0.85rem;
}

.status p { margin: 0; }
.attempts { color: var(--color-ink-muted); font-size: 0.9rem; }
.result {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.grid { display: flex; flex-direction: column; gap: var(--space-2); overflow-x: auto; }
.row { display: flex; gap: var(--space-2); }
.tile {
  position: relative;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-ink);
  font-weight: 700;
}
.tile.correct { background: var(--color-correct-bg); border-color: var(--color-correct-bg); border-style: solid; color: var(--color-correct-ink); }
.tile.present { background: var(--color-present-bg); border-color: var(--color-present-ink); border-style: dashed; color: var(--color-present-ink); }
.tile.absent { background: var(--color-absent-bg); border-style: dotted; color: var(--color-absent-ink); }
.tile .icon { position: absolute; top: 1px; right: 3px; font-size: 0.65rem; line-height: 1; }
.tile .label { font-size: 0.9rem; }

.guess-word .empty { margin: 0; color: var(--color-ink-muted); font-style: italic; }
.chips { display: flex; flex-wrap: wrap; gap: var(--space-2); list-style: none; margin: 0; padding: 0; }
.chip {
  min-height: 44px;
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  border: 1px solid var(--color-accent);
  background: var(--color-accent);
  color: var(--color-accent-ink);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.action-button {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-ink);
  font: inherit;
  cursor: pointer;
}
.action-button:hover:not(:disabled) { background: var(--color-surface-muted); }
.action-button:disabled { opacity: 0.4; cursor: not-allowed; }
.action-button.primary {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: var(--color-accent-ink);
}

.keyboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.kb-row { border-top: 1px solid var(--color-border); padding-top: var(--space-2); }
.kb-row:first-child { border-top: none; padding-top: 0; }
.kb-row-title {
  margin: 0 0 var(--space-2);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}
.kb-row-buttons { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.kb-wrapper { position: relative; display: inline-flex; }
.kb-button {
  min-width: 44px;
  min-height: 44px;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-ink);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.kb-button:hover { background: var(--color-surface-muted); }
.kb-hint {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-ink);
  color: var(--color-bg);
  font-size: 0.8rem;
  opacity: 0;
  pointer-events: none;
  z-index: 5;
}
.kb-wrapper:hover .kb-hint, .kb-wrapper:focus-within .kb-hint { opacity: 1; }

.ws-wordlist { margin-bottom: var(--space-2); }
.ws-word-items { list-style: none; display: flex; flex-wrap: wrap; gap: var(--space-2); margin: 0; padding: 0; }
.ws-word {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}
.ws-word.found {
  background: var(--color-correct-bg);
  color: var(--color-correct-ink);
  border-color: var(--color-correct-bg);
  text-decoration: line-through;
}
.ws-grid {
  --ws-cell-size: clamp(2.25rem, 6vw, 2.75rem);
  display: grid;
  grid-template-columns: repeat(var(--ws-size), var(--ws-cell-size));
  gap: var(--space-1);
  overflow-x: auto;
  padding-bottom: var(--space-1);
}
.ws-cell {
  position: relative;
  width: var(--ws-cell-size);
  height: var(--ws-cell-size);
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-ink);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}
.ws-cell:hover { background: var(--color-surface-muted); }
.ws-cell.selected { border-color: var(--color-accent); border-width: 2px; }
.ws-cell.found { background: var(--color-correct-bg); border-color: var(--color-correct-bg); color: var(--color-correct-ink); }
.ws-cell.found::after { content: "✓"; position: absolute; top: 1px; right: 3px; font-size: 0.6rem; }
`;
}
