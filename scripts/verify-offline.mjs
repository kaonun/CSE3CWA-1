import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";

// Minimal DOM adapter for these trusted, project-generated runtimes. It checks
// gameplay with no server/network APIs, not browser rendering or accessibility.
class Element {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase(); this.children = []; this.attributes = new Map();
    this.listeners = new Map(); this.className = ""; this.hidden = false; this.disabled = false; this.title = "";
    this.style = { setProperty() {} }; this.text = "";
  }
  get childElementCount() { return this.children.length; }
  set innerHTML(value) { assert.equal(value, "", "Runtime must not interpolate HTML through this adapter"); this.children = []; this.text = ""; }
  get textContent() { return this.text + this.children.map((child) => child.textContent).join(""); }
  set textContent(value) { this.text = String(value); this.children = []; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(key, value) { this.attributes.set(key, String(value)); }
  getAttribute(key) { return this.attributes.get(key) ?? null; }
  addEventListener(event, callback) { this.listeners.set(event, callback); }
  dispatch(event, payload = {}) { this.listeners.get(event)?.(payload); }
  click() { assert.ok(!this.disabled && !this.hidden, "Cannot click a disabled/hidden control"); this.listeners.get("click")?.(); }
}

function start(html) {
  assert.match(html, /^<!DOCTYPE html>/);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=|\bfetch\(|XMLHttpRequest|\/api\//);
  const config = JSON.parse(html.match(/var CONFIG = (.*);/)[1]);
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, new Element()]));
  const heading = new Element("h1");
  const document = {
    getElementById: (id) => { assert.ok(elements.has(id), `Missing exported element ${id}`); return elements.get(id); },
    createElement: (tag) => new Element(tag),
    querySelector: (selector) => { assert.equal(selector, ".page-header h1"); return heading; },
  };
  // Node's vm is not a security boundary for arbitrary third-party code. These
  // are our own export scripts; no process, filesystem or network is supplied.
  new Script(html.match(/<script>([\s\S]*)<\/script>/)[1]).runInNewContext({ document }, { timeout: 1000 });
  if (config.title) assert.equal(heading.textContent, config.title);
  return { config, elements };
}

function descendants(element) { return [element, ...element.children.flatMap(descendants)]; }
function wordle(html) {
  const { config, elements } = start(html);
  const get = (id) => elements.get(id);
  const buttons = descendants(get("keyboard")).filter((element) => element.tagName === "BUTTON");
  assert.equal(buttons.length, 43);
  // Exercise actual exported event handlers; CSS/browser focus is a separate
  // manual check. There must not be a second, native title tooltip on the keys.
  assert.ok(buttons.every((button) => !button.title));
  const wrapper = descendants(get("keyboard")).find((element) => element.className === "kb-wrapper");
  const key = wrapper.children[0];
  wrapper.dispatch("pointerenter"); key.dispatch("focus");
  assert.equal(wrapper.getAttribute("data-hint-dismissed"), "false");
  key.dispatch("keydown", { key: "Escape" });
  assert.equal(wrapper.getAttribute("data-hint-dismissed"), "true");
  wrapper.dispatch("pointerenter"); key.dispatch("keydown", { key: "ArrowRight" });
  assert.equal(wrapper.getAttribute("data-hint-dismissed"), "false");
  key.click(); assert.equal(wrapper.getAttribute("data-hint-dismissed"), "true");
  get("clear-btn").click();
  key.dispatch("focus"); assert.equal(wrapper.getAttribute("data-hint-dismissed"), "false");
  if (config.showHints) {
    assert.equal(key.getAttribute("aria-describedby"), wrapper.children[1].id);
  } else {
    assert.equal(key.getAttribute("aria-describedby"), null);
    assert.equal(wrapper.children.length, 1);
  }
  function select(symbol) {
    const button = buttons.find((element) => element.getAttribute("aria-label") === `Phoneme /${symbol}/`);
    assert.ok(button, `Missing complete-token key ${symbol}`); button.click();
  }
  const gridCells = () => get("grid").children.flatMap((row) => row.children);
  assert.equal(gridCells().length, config.maxGuesses * config.answer.length);
  assert.ok(get("submit-btn").disabled);
  select(config.answer[0]); assert.ok(get("guess-word").textContent.includes(config.answer[0]));
  get("backspace-btn").click(); assert.ok(get("submit-btn").disabled);
  config.answer.forEach(select); assert.ok(!get("submit-btn").disabled);
  get("clear-btn").click(); assert.ok(get("submit-btn").disabled);
  if (config.showHints && config.hint) assert.ok(get("status").textContent.includes(config.hint));
  if (!config.showHints) assert.ok(buttons.every((button) => !button.title));

  // A repeated-token regression checks the exported two-pass scorer itself.
  if (JSON.stringify(config.answer) === JSON.stringify(["tʃ", "eː", "tʃ"])) {
    ["tʃ", "tʃ", "tʃ"].forEach(select); get("submit-btn").click();
    assert.deepEqual(gridCells().slice(0, 3).map(({ className }) => className), ["tile correct", "tile absent", "tile correct"]);
  }
  config.answer.forEach(select); get("submit-btn").click();
  assert.match(get("status").textContent, /Solved!/);
  assert.ok(get("status").textContent.includes(config.englishWord || "(not set)"));
  assert.ok(get("keyboard").hidden && !get("reset-btn").hidden);
  get("reset-btn").click(); assert.ok(!get("keyboard").hidden && get("reset-btn").hidden);
  const wrong = buttons.map((button) => button.getAttribute("aria-label").slice(9, -1)).find((symbol) => !config.answer.includes(symbol));
  assert.ok(wrong);
  for (let guess = 0; guess < config.maxGuesses; guess++) {
    for (let token = 0; token < config.answer.length; token++) select(wrong);
    get("submit-btn").click();
  }
  assert.match(get("status").textContent, /Out of guesses/);
  assert.ok(get("status").textContent.includes(config.englishWord || "(not set)"));
  get("reset-btn").click(); assert.match(get("status").textContent, /currently 0/);
  return "Wordle: complete-token keyboard, tooltip dismissal events, length controls, hints, win/loss/reset and scoring passed without network APIs.";
}

function wordsearch(html) {
  const { config, elements } = start(html);
  const get = (id) => elements.get(id);
  const size = config.grid.length;
  assert.equal(get("grid").children.length, size * size);
  assert.deepEqual(get("grid").children.map(({ textContent }) => textContent), config.grid.flat());
  assert.equal(get("wordlist").children[0].children.length, config.placements.length);
  if (config.showHints === false) {
    assert.ok(get("grid").children.every((button) => !button.title));
    assert.deepEqual(get("wordlist").children[0].children.map(({ textContent }) => textContent), config.placements.map(({ word }) => `/${word.join(" ")}/`));
  } else {
    for (const placement of config.placements) if (placement.hint) assert.ok(get("wordlist").textContent.includes(placement.hint));
  }
  for (let i = 0; i < config.placements.length; i++) {
    const placement = config.placements[i];
    const start = placement.row * size + placement.col;
    const end = (placement.row + placement.dy * (placement.word.length - 1)) * size + placement.col + placement.dx * (placement.word.length - 1);
    // Accept backwards endpoint selection too, using freshly rendered buttons.
    get("grid").children[end].click(); get("grid").children[start].click();
    assert.ok(get("status").textContent.startsWith(`${i + 1} of ${config.placements.length}`));
  }
  assert.match(get("status").textContent, /all words found!/);
  assert.ok(get("grid").children.some((button) => button.getAttribute("aria-pressed") === "true"));
  return "Word Search: exact grid/tokens, word metadata, hints, reversed endpoint selection and completion passed without network APIs.";
}

export function verifyOfflineActivity(html) {
  const config = JSON.parse(html.match(/var CONFIG = (.*);/)[1]);
  if (Array.isArray(config.answer)) return wordle(html);
  assert.ok(Array.isArray(config.grid)); return wordsearch(html);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.length > 2, "Provide paths to project-generated HTML files.");
  for (const path of process.argv.slice(2)) console.log(verifyOfflineActivity(await readFile(path, "utf8")));
}
