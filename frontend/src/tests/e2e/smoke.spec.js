import { test, expect } from '@playwright/test';

test('starts on Currently Reading, swipes to a bookcase, pulls a book out and opens it', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');

  await expect(page.locator('.reading-title')).toBeVisible();           // start screen
  const pips = page.locator('.pip');
  expect(await pips.count()).toBeGreaterThan(3);
  await expect(pips.nth(1)).toHaveAttribute('aria-current', 'true');

  await pips.nth(2).click();                                            // first bookcase after the reading room
  const spine = page.locator('.slot:nth-child(3) .spine').first();
  await expect(spine).toBeVisible();

  await spine.click();                                                  // pull the book out
  const cover = page.locator('.stage .cover-face');
  await expect(cover).toBeVisible();
  await cover.click();                                                  // open it
  await expect(page.locator('.stage .pg-title').first()).toBeVisible();

  await page.locator('.stage-close').click();                           // put it back
  await expect(page.locator('.stage')).toHaveCount(0);
  expect(errors).toEqual([]);
});
