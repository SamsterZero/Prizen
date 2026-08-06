import { expect, test } from '@playwright/test';

test('opens Prizen without presenting account login', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Buy when the price is right.' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Open dashboard' })).toBeVisible();
	await expect(page.getByRole('link', { name: /sign in/i })).toHaveCount(0);
});
