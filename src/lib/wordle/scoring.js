// guess: string[], answer: string[] -> ("correct"|"present"|"absent")[]
export function scoreGuess(guess, answer) {
  const result = new Array(guess.length).fill("absent");
  const consumed = new Array(answer.length).fill(false);

  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
      consumed[i] = true;
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "correct") continue;
    const matchIndex = answer.findIndex(
      (token, j) => !consumed[j] && token === guess[i],
    );
    if (matchIndex !== -1) {
      result[i] = "present";
      consumed[matchIndex] = true;
    }
  }

  return result;
}

export function isWin(scores) {
  return scores.every((score) => score === "correct");
}
