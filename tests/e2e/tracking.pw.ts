import { expect, test } from '@playwright/test';

test('previews and persists a tracked product through the dashboard', async ({ page }) => {
	const productUrl = 'https://www.amazon.in/dp/B000000099';
	await page.route('**/api/products/preview', async (route) => {
		await route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({
				title: 'Playwright tracked product',
				url: productUrl,
				currentPrice: 1499,
				currency: 'INR',
				availability: 'in_stock',
				marketplace: { slug: 'amazon', name: 'Amazon' }
			})
		});
	});

	await page.goto('/dashboard');
	await page.getByRole('button', { name: 'Track product' }).first().click();
	await page.getByLabel('Amazon or Flipkart product link').fill(productUrl);
	await page.getByRole('dialog').getByRole('button', { name: 'Track product' }).click();
	await expect(page.getByText('Playwright tracked product')).toBeVisible();
	await expect(page.getByLabel('Time range')).toHaveValue('30d');
	await page.getByLabel('Time range').selectOption('7d');
	await expect(page).toHaveURL(/range=7d/);

	const response = await page.request.get('/api/tracking?range=7d&marketplace=amazon');
	expect(response.ok()).toBe(true);
	expect(response.headers()['x-prizen-result-limit']).toBe('100');
	const products = (await response.json()) as Array<{
		title: string;
		url: string;
		analyticsRange: string;
		analytics: { observationCount: number };
	}>;
	expect(products).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				title: 'Playwright tracked product',
				url: productUrl,
				analyticsRange: '7d',
				analytics: expect.objectContaining({ observationCount: expect.any(Number) })
			})
		])
	);
});
