import { expect, test } from '@playwright/test';

test('settings primary actions submit their forms', async ({ page }) => {
	const notificationRequests: Array<Record<string, unknown>> = [];
	let deliveryRequest: Record<string, unknown> | undefined;
	let marketplaceRequest: Record<string, unknown> | undefined;
	let flipkartRequest: Record<string, unknown> | undefined;

	await page.route('**/api/settings', async (route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({ contentType: 'application/json', body: '{}' });
			return;
		}
		deliveryRequest = route.request().postDataJSON() as Record<string, unknown>;
		await route.fulfill({ contentType: 'application/json', body: JSON.stringify(deliveryRequest) });
	});
	await page.route('**/api/settings/marketplaces/amazon', async (route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify({ dataSource: 'html', creatorsConfigured: false })
			});
			return;
		}
		marketplaceRequest = route.request().postDataJSON() as Record<string, unknown>;
		await route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({ dataSource: 'html', creatorsConfigured: false })
		});
	});
	await page.route('**/api/settings/marketplaces/flipkart', async (route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				contentType: 'application/json',
				body: '{"configured":false,"dataSource":"html"}'
			});
			return;
		}
		flipkartRequest = route.request().postDataJSON() as Record<string, unknown>;
		await route.fulfill({
			contentType: 'application/json',
			body: '{"configured":true,"dataSource":"affiliate-api"}'
		});
	});
	await page.route('**/api/notifications/channels', async (route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({ contentType: 'application/json', body: '[]' });
			return;
		}
		const body = route.request().postDataJSON() as Record<string, unknown>;
		notificationRequests.push(body);
		await route.fulfill({
			status: 201,
			contentType: 'application/json',
			body: JSON.stringify({
				id: `channel-${notificationRequests.length}`,
				provider: body.provider,
				label: body.label,
				isVerified: true
			})
		});
	});

	await page.goto('/settings/notifications');
	await page.getByLabel('Label').first().fill('Discord alerts');
	await page.getByLabel('Discord webhook URL').fill('https://discord.com/api/webhooks/test/token');
	await page.getByRole('button', { name: 'Connect Discord' }).click();
	await expect(
		page.locator('#notifications').getByText('Discord integration verified.')
	).toBeVisible();

	await page.getByRole('tab', { name: 'Telegram' }).click();
	await page.getByLabel('Label').last().fill('Telegram alerts');
	await page.getByLabel('Telegram chat ID').fill('123456789');
	await page.getByLabel('Telegram bot token').fill('123456:token');
	await page.getByRole('button', { name: 'Connect Telegram' }).click();
	await expect(
		page.locator('#notifications').getByText('Telegram integration verified.')
	).toBeVisible();
	await expect.poll(() => notificationRequests).toHaveLength(2);

	await page.goto('/settings/delivery');
	await page.waitForLoadState('networkidle');
	const deliveryPincode = page.getByLabel('Delivery pincode');
	await deliveryPincode.fill('560001');
	await page.getByRole('button', { name: 'Save location' }).click();
	await expect(page.locator('#delivery').getByText('Delivery location saved.')).toBeVisible();
	await expect.poll(() => deliveryRequest).toEqual({ deliveryPincode: '560001' });

	await page.goto('/settings/marketplaces');
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'Save Amazon settings' }).click();
	await expect(page.locator('#marketplaces').getByText('Amazon settings saved.')).toBeVisible();
	await expect.poll(() => marketplaceRequest).toMatchObject({ dataSource: 'html' });
	await page.getByLabel('Data source').last().selectOption('affiliate-api');
	await page.getByLabel('Affiliate ID').fill('owner-id');
	await page.getByLabel('Affiliate token').fill('owner-token');
	await page.getByRole('button', { name: 'Save Flipkart settings' }).click();
	await expect(page.locator('#marketplaces').getByText('Flipkart settings saved.')).toBeVisible();
	await expect
		.poll(() => flipkartRequest)
		.toEqual({
			dataSource: 'affiliate-api',
			affiliateId: 'owner-id',
			affiliateToken: 'owner-token'
		});
});
