import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

async function data(response) {
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data;
}

test("student views, solves and downloads a generated saved Wordle", async ({ page, request }) => {
  const list = await data(await request.post("/api/word-lists", {
    data: { title: "Generated activity fixture", description: "Playwright user workflow" },
  }));

  try {
    const word = await data(await request.post(`/api/word-lists/${list.id}/words`, {
      data: { phonemes: ["p", "æ", "t"], englishWord: "pat", hint: "A gentle tap" },
    }));
    const activity = await data(await request.post("/api/configurations", {
      data: {
        title: "Generated Playwright Wordle",
        wordListId: list.id,
        type: "wordle",
        answerWordId: word.id,
        maxGuesses: 4,
        showHints: true,
        outputTheme: "dark",
        outputFilename: "generated-playwright-wordle.html",
      },
    }));

    await page.goto(`/wordle?activity=${activity.id}`);
    const preview = page.getByRole("region", { name: "Saved activity preview" });
    await expect(page.getByRole("heading", { name: "Activity: Generated Playwright Wordle" })).toBeVisible();
    await expect(preview.getByText("Hint: A gentle tap")).toBeVisible();
    await preview.getByRole("button", { name: /Phoneme \/p\// }).click();
    await preview.getByRole("button", { name: /Phoneme \/æ\// }).click();
    await preview.getByRole("button", { name: /Phoneme \/t\// }).click();
    await preview.getByRole("button", { name: "Submit guess" }).click();
    await expect(preview.getByText("Solved!")).toBeVisible();
    await expect(preview.getByText("English word:")).toContainText("pat");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download saved Wordle" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("generated-playwright-wordle.html");
    const downloadedPath = await download.path();
    expect(downloadedPath).toBeTruthy();
    const html = await readFile(downloadedPath, "utf8");
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("Generated Playwright Wordle");
    expect(html).toContain("A gentle tap");
    await expect(page.getByRole("status").filter({ hasText: "Download requested" })).toBeVisible();
  } finally {
    const response = await request.delete(`/api/word-lists/${list.id}`);
    expect(response.status()).toBe(204);
  }
});
