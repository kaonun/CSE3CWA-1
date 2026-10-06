"use client";

import { useState } from "react";
import { describePhoneme, hintFor } from "@/data/phonemes";
import styles from "./WordSearchGrid.module.css";

function placementCells(placement) {
  const cells = [];
  for (let i = 0; i < placement.word.length; i++) {
    cells.push({
      row: placement.row + placement.dy * i,
      col: placement.col + placement.dx * i,
    });
  }
  return cells;
}

function cellsMatchPlacement(start, end, placement) {
  const cells = placementCells(placement);
  const first = cells[0];
  const last = cells[cells.length - 1];
  const forward =
    start.row === first.row &&
    start.col === first.col &&
    end.row === last.row &&
    end.col === last.col;
  const backward =
    start.row === last.row &&
    start.col === last.col &&
    end.row === first.row &&
    end.col === first.col;
  return forward || backward;
}

export default function WordSearchGrid({ grid, placements, failed }) {
  const [foundIndices, setFoundIndices] = useState([]);
  const [selectionStart, setSelectionStart] = useState(null);

  if (!grid || grid.length === 0) {
    return <p className={styles.empty}>Add words to generate a grid.</p>;
  }

  const foundCellKeys = new Set();
  foundIndices.forEach((index) => {
    placementCells(placements[index]).forEach(({ row, col }) => {
      foundCellKeys.add(`${row},${col}`);
    });
  });

  function handleCellClick(row, col) {
    if (!selectionStart) {
      setSelectionStart({ row, col });
      return;
    }
    const end = { row, col };
    const matchIndex = placements.findIndex(
      (placement, index) =>
        !foundIndices.includes(index) &&
        cellsMatchPlacement(selectionStart, end, placement),
    );
    if (matchIndex !== -1) {
      setFoundIndices((prev) => [...prev, matchIndex]);
    }
    setSelectionStart(null);
  }

  const allFound = placements.length > 0 && foundIndices.length === placements.length;

  return (
    <div className={styles.wrapper}>
      <div aria-live="polite">
        {allFound && <p className={styles.complete}>All words found!</p>}
        {failed.length > 0 && (
          <p className={styles.warning}>
            Could not fit {failed.length} word
            {failed.length === 1 ? "" : "s"} — try a bigger grid or a shorter
            word list.
          </p>
        )}
      </div>
      <div
        className={styles.grid}
        role="group"
        aria-label="Word search grid"
        style={{ "--ws-size": grid.length }}
      >
        {grid.map((row, r) =>
          row.map((symbol, c) => {
            const isSelected =
              selectionStart?.row === r && selectionStart?.col === c;
            const isFound = foundCellKeys.has(`${r},${c}`);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                className={`${styles.cell} ${isSelected ? styles.selected : ""} ${isFound ? styles.found : ""}`}
                onClick={() => handleCellClick(r, c)}
                aria-label={describePhoneme(symbol)}
                aria-pressed={isFound}
                title={hintFor(symbol)}
              >
                {symbol}
              </button>
            );
          }),
        )}
      </div>
      <p className={styles.status} aria-live="polite">
        {foundIndices.length} of {placements.length} words found
      </p>
    </div>
  );
}
