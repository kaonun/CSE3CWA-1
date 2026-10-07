"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { storageRequest } from "@/lib/api/storage";
import { ConfigurationForm, ListForm, WordForm } from "./LibraryForms";
import { savedActivityLabel } from "@/lib/activity-labels";
import styles from "./Library.module.css";

export default function Library({ initialActivityId = "" }) {
  const [lists, setLists] = useState([]);
  const [listTotal, setListTotal] = useState(0);
  const [list, setList] = useState(null);
  const [configurations, setConfigurations] = useState([]);
  const [configurationTotal, setConfigurationTotal] = useState(0);
  const [editList, setEditList] = useState(false);
  const [word, setWord] = useState(null);
  const [activity, setActivity] = useState(null);
  const [configurationSaved, setConfigurationSaved] = useState(false);
  const editorRef = useRef(null);
  const linkedEditorFocused = useRef(false);
  const [revision, setRevision] = useState(0);
  const [deletion, setDeletion] = useState(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("Loading saved lists…");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const summaries = await storageRequest("/word-lists", { signal: controller.signal });
      if (controller.signal.aborted) return;
      setLists(summaries.data); setListTotal(summaries.total);
      if (initialActivityId) {
        const selected = await storageRequest(`/configurations/${encodeURIComponent(initialActivityId)}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        const configs = await storageRequest(`/configurations?wordListId=${encodeURIComponent(selected.data.wordListId)}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setList(selected.data.wordList); setConfigurations(configs.data); setConfigurationTotal(configs.total);
        setActivity(selected.data); setMessage("Linked activity configuration loaded for editing.");
      } else setMessage("Choose a list or create a new one.");
    }
    load().catch((error) => { if (!controller.signal.aborted) { setMessage(""); setError(error.message); } })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [initialActivityId]);

  useEffect(() => {
    if (initialActivityId && activity?.id === initialActivityId && !linkedEditorFocused.current && editorRef.current) {
      linkedEditorFocused.current = true;
      editorRef.current.focus({ preventScroll: true });
      editorRef.current.scrollIntoView({ block: "start" });
    }
  }, [initialActivityId, activity?.id]);

  async function refresh(id) {
    const summaries = await storageRequest("/word-lists?limit=100");
    setLists(summaries.data); setListTotal(summaries.total);
    if (id) {
      const [selected, configs] = await Promise.all([storageRequest(`/word-lists/${id}`), storageRequest(`/configurations?wordListId=${id}`)]);
      setList(selected.data); setConfigurations(configs.data); setConfigurationTotal(configs.total);
    } else { setList(null); setConfigurations([]); setConfigurationTotal(0); }
  }
  async function run(action, success) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await action(); setMessage(success); return true; }
    catch (error) { setError(error.message); return false; }
    finally { setBusy(false); }
  }
  function resetEditors() { setWord(null); setActivity(null); setConfigurationSaved(false); setEditList(false); setDeletion(null); setRevision((value) => value + 1); }
  function chooseList(id) {
    run(async () => { await refresh(id); resetEditors(); }, "List loaded from the database.");
  }
  function saveList(body, editing) {
    run(async () => {
      const result = await storageRequest(editing ? `/word-lists/${list.id}` : "/word-lists", { method: editing ? "PATCH" : "POST", body });
      await refresh(result.data.id); resetEditors();
    }, editing ? "List details saved." : "Word list created.");
  }
  function saveWord(body) {
    run(async () => {
      await storageRequest(word ? `/words/${word.id}` : `/word-lists/${list.id}/words`, { method: word ? "PATCH" : "POST", body });
      await refresh(list.id); setWord(null); setRevision((value) => value + 1);
    }, word ? "Word updated in the database." : "Word added to the database.");
  }
  function saveConfiguration(body) {
    return run(async () => {
      setConfigurationSaved(false);
      const result = await storageRequest(activity ? `/configurations/${activity.id}` : "/configurations", { method: activity ? "PATCH" : "POST", body });
      // Keep the saved identity immediately, even if the subsequent index refresh
      // fails. In particular, the next save after creation must PATCH, not POST.
      setActivity(result.data); setConfigurationSaved(true);
      try { await refresh(list.id); }
      catch (error) { throw new Error(`The configuration was saved, but the lists could not be refreshed. ${error.message}`); }
    }, activity ? "Activity configuration updated." : "Activity configuration created.");
  }
  function confirmDeletion() {
    run(async () => {
      await storageRequest(deletion.path, { method: "DELETE" });
      await refresh(deletion.wholeList ? null : list.id); resetEditors();
    }, "Stored content deleted.");
  }
  async function moreLists() {
    const result = await storageRequest(`/word-lists?offset=${lists.length}`);
    setLists((current) => [...current, ...result.data.filter((row) => !current.some(({ id }) => row.id === id))]); setListTotal(result.total);
  }
  async function moreConfigurations() {
    const result = await storageRequest(`/configurations?wordListId=${list.id}&offset=${configurations.length}`);
    setConfigurations((current) => [...current, ...result.data.filter((row) => !current.some(({ id }) => row.id === id))]); setConfigurationTotal(result.total);
  }
  return <div className={styles.library}>
    <h1>Teacher Library</h1>
    <p>Save word lists and multiple activity configurations. Only saved changes survive a reload. Switching lists or editors discards unsaved form changes.</p>
    <p>A word list stores reusable words. A saved activity configuration has its own title and game settings and uses one word list. Several activities can share the same list.</p>
    <p>Open a saved configuration in its builder to preview and download an offline student activity using the database content.</p>
    <p role="status" aria-live="polite">{message}</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {deletion && <section className={styles.confirmation} aria-label="Confirm deletion">
      <h2>Delete {deletion.label}?</h2>
      <p>{deletion.wholeList ? "This permanently deletes the list, all its words and all its activity configurations." : "This permanently deletes this stored record."}</p>
      <button disabled={busy} onClick={confirmDeletion}>Confirm deletion</button><button disabled={busy} onClick={() => { setDeletion(null); setError(""); }}>Cancel deletion</button>
    </section>}
    <fieldset disabled={busy || !!deletion} className={styles.workspace}>
      <legend className={styles.srOnly}>Manage saved content</legend>
      <aside className={styles.panel}>
        <h2>Word lists ({listTotal})</h2>
        <p>Select a word list to see its words and saved activity configurations.</p>
        <button onClick={() => run(async () => { await refresh(list?.id); resetEditors(); }, "Saved content refreshed.")}>Reload saved content</button>
        <ul>{lists.map((row) => <li key={row.id}><button aria-pressed={row.id === list?.id} onClick={() => chooseList(row.id)}>{row.title} ({row.wordCount} {row.wordCount === 1 ? "word" : "words"})</button></li>)}</ul>
        {lists.length < listTotal && <button onClick={() => run(moreLists, "More lists loaded.")}>Load more lists</button>}
        <ListForm key={`new-${revision}`} save={(body) => saveList(body, false)} />
      </aside>
      {list ? <section className={styles.panel} aria-label="Selected list">
        <h2>Word list: {list.title}</h2><p>{list.description}</p>
        <button onClick={() => setEditList((value) => !value)}>Edit list details</button>
        <button onClick={() => setDeletion({ path: `/word-lists/${list.id}`, label: list.title, wholeList: true })}>Delete list</button>
        {editList && <ListForm key={list.id} list={list} save={(body) => saveList(body, true)} cancel={() => setEditList(false)} />}
        <h2>Words ({list.words.length}/30)</h2>
        <ul>{list.words.map((row) => <li key={row.id}>
          <span>/{row.phonemes.join("")}/ — {row.englishWord || "Untitled word"}{row.hint && ` · ${row.hint}`}</span>
          <button onClick={() => { setWord(row); setRevision((value) => value + 1); }}>Edit word {row.englishWord || row.phonemes.join("")}</button>
          <button onClick={() => setDeletion({ path: `/words/${row.id}`, label: `word ${row.englishWord || row.phonemes.join("")}` })}>Delete word {row.englishWord || row.phonemes.join("")}</button>
        </li>)}</ul>
        <WordForm key={`word-${list.id}-${word?.id}-${revision}`} word={word} save={saveWord} cancel={() => { setWord(null); setError(""); setRevision((value) => value + 1); }} />
        <h2>Activity configurations ({configurationTotal})</h2>
        <p>These saved activities use the word list “{list.title}”. Their activity titles appear in the builders’ saved activity menus. Activities stay in creation order (oldest first), even after edits.</p>
        <ul>{configurations.map((row) => <li key={row.id}>
          <span>{savedActivityLabel({ ...row, listTitle: list.title })} — {row.type === "wordle" ? "Wordle" : "Word Search"}</span>
          <Link href={`/${row.type}?activity=${encodeURIComponent(row.id)}`}>Open {row.title} in builder</Link>
          <button aria-pressed={activity?.id === row.id} onClick={() => run(async () => { const result = await storageRequest(`/configurations/${row.id}`); setActivity(result.data); setConfigurationSaved(false); setRevision((value) => value + 1); }, "Configuration loaded from the database.")}>Edit configuration {row.title}</button>
          <button onClick={() => setDeletion({ path: `/configurations/${row.id}`, label: `configuration ${row.title}` })}>Delete configuration {row.title}</button>
        </li>)}</ul>
        {configurations.length < configurationTotal && <button onClick={() => run(moreConfigurations, "More configurations loaded.")}>Load more configurations</button>}
        {!list.words.length && <p>Add a word before saving an activity configuration.</p>}
        <section id="activity-editor" className={styles.editor} ref={editorRef} tabIndex={-1} aria-label="Activity configuration editor">
          <ConfigurationForm key={`config-${list.id}-${activity?.id}-${revision}`} activity={activity} list={list} save={saveConfiguration}
            saved={configurationSaved} onChange={() => setConfigurationSaved(false)}
            cancel={() => { setActivity(null); setConfigurationSaved(false); setRevision((value) => value + 1); }} />
        </section>
      </section> : <section className={styles.panel}><h2>No list selected</h2><p>Create or select a list to manage its words and activity configurations.</p></section>}
    </fieldset>
  </div>;
}
