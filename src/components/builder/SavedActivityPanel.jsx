"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { storageRequest } from "@/lib/api/storage";
import { downloadHtml } from "@/lib/export/download";
import WordlePreview from "@/components/wordle/WordlePreview";
import WordSearchGrid from "@/components/wordsearch/WordSearchGrid";
import { formatTimestamp, libraryActivityHref, savedActivityLabel } from "@/lib/activity-labels";
import SavedActivityDetails from "./SavedActivityDetails";
import styles from "./SavedActivityPanel.module.css";

export default function SavedActivityPanel({ type }) {
  const query = useSearchParams();
  const initialId = query.get("activity") || "";
  // Navigation to another Library link must discard the previous snapshot/game.
  return <SavedActivityWorkspace key={`${type}:${initialId}`} type={type} initialId={initialId} />;
}

function SavedActivityWorkspace({ type, initialId }) {
  const label = type === "wordle" ? "Wordle" : "Word Search";
  const [choices, setChoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [indexBusy, setIndexBusy] = useState(true);
  const [indexError, setIndexError] = useState("");
  const [selectedId, setSelectedId] = useState(initialId);
  const [version, setVersion] = useState(0);
  const [response, setResponse] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState(null);
  const requestKey = JSON.stringify({ selectedId, version });
  const current = response?.key === requestKey ? response : null;
  const loading = !!selectedId && !current;
  const activity = current?.activity;
  const saved = activity?.configuration;
  const answer = saved?.type === "wordle" ? saved.wordList.words.find(({ id }) => id === saved.answerWordId) : null;

  useEffect(() => {
    const controller = new AbortController();
    storageRequest(`/configurations?type=${type}`, { signal: controller.signal }).then((result) => {
      setChoices(result.data); setTotal(result.total);
    }).catch((error) => { if (!controller.signal.aborted) setIndexError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setIndexBusy(false); });
    return () => controller.abort();
  }, [type]);

  useEffect(() => {
    const { selectedId } = JSON.parse(requestKey);
    if (!selectedId) return;
    const controller = new AbortController();
    storageRequest(`/configurations/${encodeURIComponent(selectedId)}/generate`, {
      method: "POST", body: {}, signal: controller.signal,
    }).then(({ data }) => {
      if (data.configuration.type !== type) throw new Error(`This saved configuration is not a ${label}. Open it from the Library in the correct builder.`);
      if (!controller.signal.aborted) setResponse({ key: requestKey, activity: data });
    }).catch((error) => { if (!controller.signal.aborted) setResponse({ key: requestKey, error: error.message }); });
    return () => controller.abort();
  }, [requestKey, type, label]);

  async function loadChoices(more = false) {
    setIndexBusy(true); setIndexError("");
    try {
      const result = await storageRequest(`/configurations?type=${type}&offset=${more ? choices.length : 0}`);
      setChoices((previous) => more ? [...previous, ...result.data.filter((row) => !previous.some(({ id }) => id === row.id))] : result.data);
      setTotal(result.total);
    } catch (error) { setIndexError(error.message); }
    finally { setIndexBusy(false); }
  }

  return <section className={styles.panel} aria-label={`Saved ${label} activities`}>
    <h1>{label} from saved content</h1>
    <p>Select a saved activity, not a word list. Each activity has its own title and settings and uses a source word list from the <Link href="/library">Teacher Library</Link>.</p>
    <label htmlFor={`saved-${type}`}>Saved {label} activity</label>
    <select id={`saved-${type}`} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
      <option value="">Choose a saved {label} activity</option>
      {selectedId && !choices.some(({ id }) => id === selectedId) && <option value={selectedId}>{saved ? savedActivityLabel({ ...saved, listTitle: saved.wordList.title }) : "Linked activity (loading details)"}</option>}
      {choices.map((row) => <option key={row.id} value={row.id}>{savedActivityLabel(row)}</option>)}
    </select>
    <div className={styles.actions}>
      <button disabled={indexBusy} onClick={() => loadChoices()}>Refresh saved choices</button>
      {choices.length < total && <button disabled={indexBusy} onClick={() => loadChoices(true)}>Load more configurations</button>}
      <button disabled={!selectedId || loading} onClick={() => setVersion((value) => value + 1)}>Reload and regenerate</button>
      <button disabled={!activity} onClick={() => {
        downloadHtml(activity.filename, activity.html);
        setDownloadStatus({ key: requestKey, filename: activity.filename });
      }}>Download saved {label}</button>
    </div>
    <p>Preview and download share this saved-data snapshot. After editing the Library, use Reload and regenerate to fetch the latest version. Reloading a Word Search generates a new layout.</p>
    {indexBusy && <p role="status">Loading saved choices…</p>}
    {indexError && <p role="alert">{indexError}</p>}
    {!indexBusy && !total && !indexError && <p>No saved {label} configurations yet. Create one in the Library.</p>}
    {loading && <p role="status">Generating from the database…</p>}
    {current?.error && <p role="alert">{current.error}</p>}
    {downloadStatus?.key === requestKey && <p role="status">Download requested: {downloadStatus.filename}</p>}
    {saved && <div className={styles.snapshot}>
      <div>
        <SavedActivityDetails saved={saved} />
        <p>Output: {activity.filename} · {saved.outputTheme} theme · hints {saved.showHints ? "on" : "off"}</p>
        <p>{type === "wordle" ? `${saved.maxGuesses} guesses` : `${saved.gridSize} × ${saved.gridSize} · ${saved.difficulty}`}</p>
        <p>
          List saved: <time dateTime={saved.wordList.updatedAt}>{formatTimestamp(saved.wordList.updatedAt)}</time>
          <br />
          Settings saved: <time dateTime={saved.updatedAt}>{formatTimestamp(saved.updatedAt)}</time>
        </p>
        <Link href={libraryActivityHref(saved.id)}>Edit this activity configuration in Library</Link>
      </div>
      <section aria-label="Saved activity preview" className={styles.game} data-theme={saved.outputTheme}>
        <h2>Saved activity preview</h2>
        {type === "wordle" ? <WordlePreview key={requestKey} answer={answer.phonemes} englishWord={answer.englishWord}
          hint={answer.hint} maxGuesses={saved.maxGuesses} showHints={saved.showHints} /> : <>
          <ul>{activity.preview.placements.map((word) => <li key={word.id}>/{word.word.join(" ")}/
            {saved.showHints && word.englishWord && ` — ${word.englishWord}`}{saved.showHints && word.hint && ` · ${word.hint}`}</li>)}</ul>
          <WordSearchGrid key={requestKey} {...activity.preview} showHints={saved.showHints} />
        </>}
      </section>
    </div>}
  </section>;
}
