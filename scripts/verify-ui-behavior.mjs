import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import * as phonemes from "../src/data/phonemes.js";
import { libraryActivityHref, savedActivityLabel } from "../src/lib/activity-labels.js";

const require = createRequire(import.meta.url);
const { loadBindings, transform } = require("next/dist/build/swc");
await loadBindings();

// Run our actual JSX components with tiny hook substitutes. This verifies event
// state and rendered markup without a browser, not CSS layout/focus heuristics.
// Only trusted project source is executed; Node's VM is not a security sandbox.
async function componentHarness(path, { imports = {}, exportName = "default" } = {}) {
  const url = new URL(path, import.meta.url);
  const { code } = await transform(await readFile(url, "utf8"), {
    filename: fileURLToPath(url),
    jsc: { target: "es2022", parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } } },
    module: { type: "commonjs" },
  });
  const state = [];
  const effects = new Map();
  const pendingEffects = new Map();
  let cursor = 0;
  const hooks = {
    useId: () => "unit-phoneme-hint",
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
      return [state[index], (value) => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = { current: initial };
      return state[index];
    },
    useEffect(callback, dependencies) {
      const index = cursor++;
      const previous = effects.get(index);
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
        effects.set(index, { dependencies, cleanup: previous?.cleanup });
        pendingEffects.set(index, callback);
      }
    },
  };
  const exports = {};
  new Script(code, { filename: fileURLToPath(url) }).runInNewContext({
    exports, AbortController,
    require(id) {
      if (id === "react") return hooks;
      if (id === "@/data/phonemes") return phonemes;
      if (id in imports) return imports[id];
      if (id.endsWith(".module.css")) return { wrapper: "wrapper", button: "button", hint: "hint", saveActions: "saveActions", saved: "saved", editor: "editor" };
      if (id === "react/jsx-runtime" || id.startsWith("@swc/helpers/")) return require(id);
      throw new Error(`Unexpected component dependency: ${id}`);
    },
  }, { timeout: 1000 });
  const render = (props) => { cursor = 0; return exports[exportName](props); };
  render.flushEffects = async () => {
    const pending = [...pendingEffects]; pendingEffects.clear();
    for (const [index, callback] of pending) {
      const effect = effects.get(index); effect.cleanup?.(); effect.cleanup = callback();
    }
    await settle();
  };
  render.dispose = () => { for (const effect of effects.values()) effect.cleanup?.(); };
  return render;
}

const settle = () => new Promise((resolve) => setImmediate(resolve));
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function textIn(tree) {
  if (typeof tree === "string" || typeof tree === "number") return String(tree);
  if (Array.isArray(tree)) return tree.map(textIn).join("");
  return tree?.props ? textIn(tree.props.children) : "";
}

let passed = 0;
async function check(name, run) {
  await run(); passed++; console.log(`PASS ${name}`);
}
const renderDetails = await componentHarness("../src/components/builder/SavedActivityDetails.jsx");
const words = [
  { id: "first", phonemes: ["p", "n", "b"], englishWord: "Piggy" },
  { id: "second", phonemes: ["p", "m", "f"], englishWord: "Pmf" },
];
const saved = { title: "testh", type: "wordle", answerWordId: "second", wordList: { title: "Test", words } };

await check("activity labels explicitly distinguish each activity from its shared word list", () => {
  assert.equal(savedActivityLabel({ title: "testh", listTitle: "Test" }), "Activity: testh — Word list: Test");
  assert.equal(savedActivityLabel({ title: "k", listTitle: "Test" }), "Activity: k — Word list: Test");
});
await check("teacher Wordle summary identifies only the selected answer, even when it is not the first word", () => {
  const html = renderToStaticMarkup(renderDetails({ saved }));
  assert.match(html, /Activity: testh/); assert.match(html, /Source word list: Test/);
  assert.match(html, /Selected Wordle answer \(teacher view\)<\/h3><p><strong>\/p m f\/ — Pmf/);
  assert.match(html, /one correct answer/);
  assert.match(html, /\/p n b\/ — Piggy — Not this activity’s answer/);
  assert.match(html, /\/p m f\/ — Pmf — Selected answer/);
  assert.match(html, /<details><summary>Source word list \(2 words\)/);
  assert.doesNotMatch(html, /<details open/);
});
await check("single-word and multi-character answers retain complete tokens and clear labels", () => {
  const single = { ...saved, answerWordId: "first", wordList: { title: "Single", words: [{ ...words[0], phonemes: ["tʃ", "eː"], englishWord: "" }] } };
  const html = renderToStaticMarkup(renderDetails({ saved: single }));
  assert.match(html, /\/tʃ eː\/ — Untitled word/);
  assert.match(html, /Source word list \(1 word\)/);
});
await check("Word Search summary includes all target words without suggesting a single answer", () => {
  const html = renderToStaticMarkup(renderDetails({ saved: { ...saved, type: "wordsearch", answerWordId: null } }));
  assert.match(html, /Words included in this Word Search/);
  assert.match(html, /\/p n b\/ — Piggy/); assert.match(html, /\/p m f\/ — Pmf/);
  assert.doesNotMatch(html, /Selected answer|one correct answer|<details>/);
});
await check("teacher metadata remains escaped rather than interpreted as HTML", () => {
  const html = renderToStaticMarkup(renderDetails({ saved: { ...saved, title: "<script>example</script>" } }));
  assert.match(html, /&lt;script&gt;example&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

const renderButton = await componentHarness("../src/components/phoneme/PhonemeButton.jsx");
const selected = [];
const props = { symbol: "eː", onClick: (symbol) => selected.push(symbol) };
const buttonIn = (tree) => tree.props.children[0];
await check("phoneme hint keeps its accessible description and complete-token selection", () => {
  const tree = renderButton(props);
  assert.equal(tree.props["data-hint-dismissed"], false);
  assert.equal(buttonIn(tree).props["aria-describedby"], tree.props.children[1].props.id);
  assert.equal(buttonIn(tree).props["aria-label"], "Phoneme /eː/");
  buttonIn(tree).props.onClick();
  assert.deepEqual(selected, ["eː"]);
});
await check("pressing a phoneme dismisses its hint without removing keyboard focus", () => {
  const tree = renderButton(props);
  assert.equal(tree.props["data-hint-dismissed"], true);
  // Activation needs no event target and never calls blur().
  buttonIn(tree).props.onClick();
  assert.equal(renderButton(props).props["data-hint-dismissed"], true);
});
await check("re-entering a key or focusing it anew makes the hint available again", () => {
  renderButton(props).props.onPointerEnter();
  assert.equal(renderButton(props).props["data-hint-dismissed"], false);
  buttonIn(renderButton(props)).props.onClick();
  buttonIn(renderButton(props)).props.onFocus();
  assert.equal(renderButton(props).props["data-hint-dismissed"], false);
});
await check("Escape dismisses a hint and other keys do not dismiss it", () => {
  buttonIn(renderButton(props)).props.onKeyDown({ key: "ArrowRight" });
  assert.equal(renderButton(props).props["data-hint-dismissed"], false);
  buttonIn(renderButton(props)).props.onKeyDown({ key: "Escape" });
  assert.equal(renderButton(props).props["data-hint-dismissed"], true);
});
await check("disabled keys and hints-off retain their intended control semantics", () => {
  const tree = renderButton({ ...props, disabled: true, showHint: false });
  assert.equal(buttonIn(tree).props.disabled, true);
  assert.equal(buttonIn(tree).props["aria-describedby"], undefined);
  assert.equal(tree.props.children[1], false);
});
await check("React and offline styles suppress dismissed hints and use keyboard-only focus visibility", async () => {
  for (const path of ["../src/components/phoneme/PhonemeButton.module.css", "../src/lib/export/styles.js"]) {
    const css = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(css, /:not\(\[data-hint-dismissed="true"\]\):hover/);
    assert.match(css, /:focus-visible \+/);
    assert.doesNotMatch(css, /:focus-within/);
  }
});

await check("saved builder edit links point to the exact Library activity and editor anchor", () => {
  assert.equal(libraryActivityHref("config-2"), "/library?activity=config-2#activity-editor");
  assert.equal(libraryActivityHref("a&b/#"), "/library?activity=a%26b%2F%23#activity-editor");
});
await check("Library page awaits query parameters and keys a fresh workspace to each linked activity", async () => {
  const page = await componentHarness("../src/app/library/page.js", {
    imports: { "@/components/library/Library": { default: "Library", __esModule: true } },
  });
  for (const id of ["config-1", "config-2"]) {
    const tree = await page({ searchParams: Promise.resolve({ activity: id }) });
    assert.equal(tree.props.initialActivityId, id); assert.equal(tree.key, id);
  }
  assert.equal((await page({ searchParams: Promise.resolve({}) })).props.initialActivityId, "");
  assert.equal((await page({ searchParams: Promise.resolve({ activity: ["one", "two"] }) })).props.initialActivityId, "");
});

async function libraryScenario({ type = "wordle", initialId = "config-2", missing = false } = {}) {
  const list = { ...saved.wordList, id: "list-1", description: "" };
  let activity = { ...saved, id: "config-2", type, wordListId: list.id, wordList: list, maxGuesses: 6 };
  const calls = [];
  const failure = { write: false, refresh: false };
  const render = await componentHarness("../src/components/library/Library.jsx", { imports: {
    "next/link": { default: "a", __esModule: true },
    "@/lib/activity-labels": { savedActivityLabel },
    "./LibraryForms": { ConfigurationForm: "ConfigurationForm", ListForm: "ListForm", WordForm: "WordForm" },
    "@/lib/api/storage": { async storageRequest(path, options = {}) {
      calls.push({ path, ...options });
      const method = options.method || "GET";
      if (method === "POST" || method === "PATCH") {
        if (failure.write) throw new Error("Validation failed: fix the activity title.");
        activity = { ...activity, ...options.body, id: method === "POST" ? "created-config" : activity.id, wordList: list };
        return { data: activity };
      }
      if (path === "/word-lists?limit=100" && failure.refresh) throw new Error("Index temporarily unavailable.");
      if (path === "/word-lists" || path === "/word-lists?limit=100") return { data: [{ id: list.id, title: list.title, wordCount: 2 }], total: 1 };
      if (path === `/word-lists/${list.id}`) return { data: list };
      if (path === `/configurations?wordListId=${list.id}`) return { data: [activity], total: 1 };
      if (path.startsWith("/configurations/")) {
        if (missing) throw new Error("Activity configuration was not found. It may have been deleted.");
        return { data: activity };
      }
      throw new Error(`Unexpected test request: ${path}`);
    } },
  } });
  const props = { initialActivityId: initialId };
  render(props); await render.flushEffects();
  const tree = () => render(props);
  if (!initialId) {
    nodes(tree()).find((node) => node.type === "button" && textIn(node).startsWith("Test (")).props.onClick();
    await settle();
  }
  return { render, tree, calls, failure, form: () => nodes(tree()).find(({ type }) => type === "ConfigurationForm") };
}
await check("deep links load the corresponding list and configuration for both game types", async () => {
  for (const type of ["wordle", "wordsearch"]) {
    const scenario = await libraryScenario({ type });
    const form = scenario.form();
    assert.equal(form.props.activity.id, "config-2"); assert.equal(form.props.activity.type, type);
    assert.equal(form.props.list.id, "list-1"); assert.equal(form.props.saved, false);
    assert.ok(scenario.calls.every(({ method }) => !method || method === "GET"));
    const editor = nodes(scenario.tree()).find(({ props }) => props.id === "activity-editor");
    const focus = [];
    editor.props.ref.current = { focus: () => focus.push("focus"), scrollIntoView: () => focus.push("scroll") };
    await scenario.render.flushEffects();
    assert.deepEqual(focus, ["focus", "scroll"]);
    scenario.tree(); await scenario.render.flushEffects(); assert.equal(focus.length, 2);
    scenario.render.dispose();
  }
});
await check("saving an edit keeps the same editor key and shows Saved; further edits clear that feedback", async () => {
  const scenario = await libraryScenario();
  const before = scenario.form();
  assert.equal(await before.props.save({ title: "Edited title", maxGuesses: 5 }), true);
  const after = scenario.form();
  assert.equal(after.key, before.key); assert.equal(after.props.activity.id, "config-2");
  assert.equal(after.props.activity.title, "Edited title"); assert.equal(after.props.saved, true);
  assert.equal(scenario.calls.filter(({ method }) => method === "PATCH").length, 1);
  after.props.onChange(); assert.equal(scenario.form().props.saved, false);
  scenario.render.dispose();
});
await check("creating then saving again retains the new identity and does not create a duplicate", async () => {
  const scenario = await libraryScenario({ initialId: "" });
  assert.equal(scenario.form().props.activity, null);
  await scenario.form().props.save({ title: "New activity", type: "wordle" });
  assert.equal(scenario.form().props.activity.id, "created-config"); assert.equal(scenario.form().props.saved, true);
  await scenario.form().props.save({ title: "New activity edited" });
  assert.equal(scenario.calls.filter(({ method }) => method === "POST").length, 1);
  assert.equal(scenario.calls.filter(({ method }) => method === "PATCH").length, 1);
  assert.equal(scenario.form().props.activity.id, "created-config");
  scenario.render.dispose();
});
await check("failed writes retain the selected editor and do not claim Saved", async () => {
  const scenario = await libraryScenario(); const key = scenario.form().key;
  scenario.failure.write = true;
  assert.equal(await scenario.form().props.save({ title: "" }), false);
  assert.equal(scenario.form().key, key); assert.equal(scenario.form().props.activity.id, "config-2");
  assert.equal(scenario.form().props.saved, false);
  assert.match(textIn(scenario.tree()), /Validation failed/);
  scenario.render.dispose();
});
await check("a confirmed creation retains its ID even if refreshing the list fails afterward", async () => {
  const scenario = await libraryScenario({ initialId: "" }); scenario.failure.refresh = true;
  await scenario.form().props.save({ title: "Confirmed creation" });
  assert.equal(scenario.form().props.activity.id, "created-config"); assert.equal(scenario.form().props.saved, true);
  assert.match(textIn(scenario.tree()), /configuration was saved, but the lists could not be refreshed/);
  scenario.failure.refresh = false;
  await scenario.form().props.save({ title: "Confirmed edit" });
  assert.equal(scenario.calls.filter(({ method }) => method === "POST").length, 1);
  assert.equal(scenario.calls.filter(({ method }) => method === "PATCH").length, 1);
  scenario.render.dispose();
});
await check("missing/deleted deep links show a recoverable error without selecting unrelated content", async () => {
  const scenario = await libraryScenario({ missing: true });
  assert.equal(scenario.form(), undefined);
  assert.match(textIn(scenario.tree()), /was not found/);
  assert.doesNotMatch(textIn(scenario.tree()), /Loading saved lists/);
  scenario.render.dispose();
});
await check("Saved feedback is next to the save button and draft fields remain editable", async () => {
  let changed = 0;
  const render = await componentHarness("../src/components/library/LibraryForms.jsx", {
    exportName: "ConfigurationForm", imports: {
      "@/components/phoneme/PhonemeKeyboard": { default: "PhonemeKeyboard", __esModule: true },
      "@/components/phoneme/PhonemeWordDisplay": { default: "PhonemeWordDisplay", __esModule: true },
    },
  });
  const props = { activity: { ...saved, id: "config-2" }, list: saved.wordList, saved: true, onChange: () => changed++, save() {} };
  const tree = render(props);
  const actions = nodes(tree).find(({ props }) => props.className === "saveActions");
  assert.match(textIn(actions), /Save configurationSaved/);
  assert.equal(nodes(actions).find(({ props }) => props.role === "status").props["aria-live"], "polite");
  const title = nodes(tree).find(({ type }) => type === "input");
  title.props.onChange({ target: { value: "Forgotten final edit" } }); tree.props.onChange();
  const next = render({ ...props, saved: false, activity: { ...props.activity, title: "Saved server title" } });
  assert.equal(nodes(next).find(({ type }) => type === "input").props.value, "Forgotten final edit");
  assert.equal(changed, 1); assert.doesNotMatch(textIn(next), /Saved/);
});
console.log(`\n${passed} UI behavior checks passed (component state/markup, not browser layout).`);
