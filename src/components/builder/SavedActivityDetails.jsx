export default function SavedActivityDetails({ saved }) {
  const words = saved.wordList.words;
  const answer = saved.type === "wordle" ? words.find(({ id }) => id === saved.answerWordId) : null;
  const wordLabel = (word) => `/${word.phonemes.join(" ")}/ — ${word.englishWord || "Untitled word"}`;

  return <>
    <h2>Activity: {saved.title}</h2>
    <p>Source word list: {saved.wordList.title}</p>
    {saved.type === "wordle" ? <>
      <h3>Selected Wordle answer (teacher view)</h3>
      <p><strong>{wordLabel(answer)}</strong></p>
      <p>This activity has one correct answer. Other words in the source list are not alternative correct answers.</p>
      <details>
        <summary>Source word list ({words.length} {words.length === 1 ? "word" : "words"})</summary>
        <ul aria-label="Source word list">{words.map((word) => <li key={word.id}>
          {wordLabel(word)} — {word.id === saved.answerWordId ? "Selected answer" : "Not this activity’s answer"}
        </li>)}</ul>
      </details>
    </> : <>
      <h3>Words included in this Word Search</h3>
      <ul aria-label="Word Search target words">{words.map((word) => <li key={word.id}>{wordLabel(word)}</li>)}</ul>
    </>}
  </>;
}
