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
				availability: 'in_stock'
			})
		});
	});

	await page.goto('/dashboard');
	await page.getByRole('button', { name: 'Track product' }).first().click();
	await page.getByLabel('Amazon product link').fill(productUrl);
	await page.getByRole('dialog').getByRole('button', { name: 'Track product' }).click();
	await expect(page.getByText('Playwright tracked product')).toBeVisible();

	const response = await page.request.get('/api/tracking');
	expect(response.ok()).toBe(true);
	const products = (await response.json()) as Array<{ title: string; url: string }>;
	expect(products).toEqual(
		expect.arrayContaining([{ title: 'Playwright tracked product', url: productUrl }])
	);
});
