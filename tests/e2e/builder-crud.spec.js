import { expect, test } from "@playwright/test";

test("teacher creates, reads, updates and deletes builder content", async ({ page }) => {
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Teacher Library" })).toBeVisible();

  const newList = page.getByRole("heading", { name: "New word list" }).locator("..");
  await newList.getByLabel("List title").fill("Playwright phoneme list");
  await newList.getByLabel("Description").fill("Created through the browser test");
  await newList.getByRole("button", { name: "Create list" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Word list created" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Word list: Playwright phoneme list" })).toBeVisible();

  const addWord = page.getByRole("heading", { name: "Add word" }).locator("..");
  await addWord.getByRole("button", { name: "Phoneme /p/" }).click();
  await addWord.getByRole("button", { name: "Phoneme /æ/" }).click();
  await addWord.getByRole("button", { name: "Phoneme /t/" }).click();
  await addWord.getByLabel("English word").fill("pat");
  await addWord.getByLabel("Word hint").fill("A gentle tap");
  await addWord.getByRole("button", { name: "Add word to list" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Word added to the database" })).toBeVisible();
  await expect(page.getByText("/pæt/ — pat · A gentle tap")).toBeVisible();

  const activity = page.getByRole("heading", { name: "New activity configuration" }).locator("..");
  await activity.getByLabel("Activity title").fill("Playwright Wordle");
  await activity.getByLabel("Maximum guesses").fill("4");
  await activity.getByLabel("Output theme").selectOption("dark");
  await activity.getByLabel("Output filename").fill("playwright-wordle.html");
  await activity.getByRole("button", { name: "Create configuration" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Activity configuration created" })).toBeVisible();
  await expect(page.getByText("Activity: Playwright Wordle — Word list: Playwright phoneme list", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Edit list details" }).click();
  const editList = page.getByRole("heading", { name: "Edit list details" }).locator("..");
  await editList.getByLabel("List title").fill("Updated Playwright list");
  await editList.getByRole("button", { name: "Save list details" }).click();
  await expect(page.getByRole("status").filter({ hasText: "List details saved" })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: /Updated Playwright list \(1 word\)/ }).click();
  await expect(page.getByRole("heading", { name: "Word list: Updated Playwright list" })).toBeVisible();
  await expect(page.getByText("/pæt/ — pat · A gentle tap")).toBeVisible();

  await page.getByRole("button", { name: "Delete list" }).click();
  await expect(page.getByRole("region", { name: "Confirm deletion" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm deletion" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Stored content deleted" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Updated Playwright list/ })).toHaveCount(0);
});
