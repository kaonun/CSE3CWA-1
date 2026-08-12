import { PHONEMES } from "@/data/phonemes";

const MAX_ATTEMPTS_PER_WORD = 200;

function buildDirections({ diagonals, reversals }) {
  const base = [
    [1, 0], // right
    [0, 1], // down
  ];
  if (diagonals) {
    base.push([1, 1], [-1, 1]); // down-right, down-left
  }
  if (reversals) {
    return [...base, ...base.map(([dx, dy]) => [-dx, -dy])];
  }
  return base;
}

function fits(grid, size, word, row, col, dx, dy) {
  for (let i = 0; i < word.length; i++) {
    const r = row + dy * i;
    const c = col + dx * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    const existing = grid[r][c];
    if (existing !== null && existing !== word[i]) return false;
  }
  return true;
}

function place(grid, word, row, col, dx, dy) {
  for (let i = 0; i < word.length; i++) {
    grid[row + dy * i][col + dx * i] = word[i];
  }
}

function randomPhoneme() {
  return PHONEMES[Math.floor(Math.random() * PHONEMES.length)].symbol;
}

// words: string[][], size: number, opts: {diagonals, reversals}
// -> { grid: string[][], placements: [...], failed: string[][] }
export function generateWordSearch(words, size, opts = {}) {
  const { diagonals = false, reversals = false } = opts;
  const directions = buildDirections({ diagonals, reversals });

  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const ordered = [...words].sort((a, b) => b.length - a.length);

  const placements = [];
  const failed = [];

  for (const word of ordered) {
    let placed = false;
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_WORD && !placed; attempt++) {
      const [dx, dy] = directions[Math.floor(Math.random() * directions.length)];
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);
      if (fits(grid, size, word, row, col, dx, dy)) {
        place(grid, word, row, col, dx, dy);
        placements.push({ word, row, col, dx, dy });
        placed = true;
      }
    }
    if (!placed) failed.push(word);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === null) {
        grid[r][c] = randomPhoneme();
      }
    }
  }

  return { grid, placements, failed };
}
