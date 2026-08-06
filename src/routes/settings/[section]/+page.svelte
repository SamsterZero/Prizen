<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import LogoMark from '$lib/components/logo-mark.svelte';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		ArrowLeft,
		Bell,
		CircleCheck,
		MapPin,
		MessageCircle,
		Send,
		ShieldCheck,
		ShoppingBag,
		Trash2
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	type NotificationChannel = {
		id: string;
		provider: 'discord' | 'telegram';
		label: string;
		isVerified: boolean;
	};
	type SettingsSection = 'marketplaces' | 'delivery' | 'notifications';

	const activeSection = $derived(page.params.section as SettingsSection);

	let channels = $state<NotificationChannel[]>([]);
	let loading = $state(true);
	let activeProvider = $state<'discord' | 'telegram'>('discord');
	let discordLabel = $state('');
	let discordWebhook = $state('');
	let telegramLabel = $state('');
	let telegramChatId = $state('');
	let telegramBotToken = $state('');
	let message = $state('');
	let isError = $state(false);
	let saving = $state(false);
	let deliveryPincode = $state('');
	let savingPincode = $state(false);
	let pincodeMessage = $state('');

	async function loadChannels() {
		loading = true;
		try {
			const response = await fetch('/api/notifications/channels');
			if (!response.ok) throw new Error('Could not load notification integrations.');
			channels = (await response.json()) as NotificationChannel[];
		} catch (exception) {
			isError = true;
			message = exception instanceof Error ? exception.message : 'Could not load integrations.';
		} finally {
			loading = false;
		}
	}

	async function loadSettings() {
		const response = await fetch('/api/settings');
		if (response.ok) {
			const settings = (await response.json()) as { deliveryPincode?: string };
			deliveryPincode = settings.deliveryPincode ?? '';
		}
	}

	$effect(() => {
		if (activeSection === 'notifications') void loadChannels();
		if (activeSection === 'delivery') void loadSettings();
	});

	async function savePincode() {
		savingPincode = true;
		pincodeMessage = '';
		try {
			const response = await fetch('/api/settings', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ deliveryPincode })
			});
			const data = (await response.json()) as { deliveryPincode?: string; message?: string };
			if (!response.ok) throw new Error(data.message ?? 'Could not save delivery pincode.');
			deliveryPincode = data.deliveryPincode ?? deliveryPincode;
			pincodeMessage = 'Delivery location saved.';
			toast.success(pincodeMessage);
		} catch (exception) {
			pincodeMessage = exception instanceof Error ? exception.message : 'Could not save pincode.';
			toast.error(pincodeMessage);
		} finally {
			savingPincode = false;
		}
	}

	async function saveChannel(provider: 'discord' | 'telegram') {
		if (saving) return;
		const label = provider === 'discord' ? discordLabel : telegramLabel;
		const destination = provider === 'discord' ? discordWebhook : telegramChatId;
		const botToken = provider === 'telegram' ? telegramBotToken : '';
		saving = true;
		message = '';
		isError = false;
		try {
			const response = await fetch('/api/notifications/channels', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ provider, label, destination, botToken })
			});
			const data = (await response.json()) as NotificationChannel & { message?: string };
			if (!response.ok) throw new Error(data.message ?? 'Could not verify this integration.');
			channels = [data, ...channels];
			if (provider === 'discord') {
				discordLabel = '';
				discordWebhook = '';
			} else {
				telegramLabel = '';
				telegramChatId = '';
				telegramBotToken = '';
			}
			message = `${provider === 'discord' ? 'Discord' : 'Telegram'} integration verified.`;
			toast.success(message);
		} catch (exception) {
			isError = true;
			message = exception instanceof Error ? exception.message : 'Could not save this integration.';
			toast.error(message);
		} finally {
			saving = false;
		}
	}

	async function removeChannel(channel: NotificationChannel) {
		const response = await fetch(`/api/notifications/channels/${channel.id}`, {
			method: 'DELETE'
		});
		if (response.ok || response.status === 404) {
			channels = channels.filter((item) => item.id !== channel.id);
			message = `${channel.label} removed.`;
			isError = false;
			toast.success(message);
		} else {
			message = 'Could not remove this integration.';
			isError = true;
		}
	}
</script>

<svelte:head>
	<title>Settings — Prizen</title>
	<meta name="description" content="Configure Prizen notification integrations." />
</svelte:head>

<div class="app-surface min-h-screen bg-[#f8f9ff] text-slate-950">
	<header class="dashboard-nav border-b border-slate-200 bg-white">
		<div class="page-shell flex items-center justify-between py-4">
			<a class="flex items-center gap-2 text-xl font-black tracking-tight" href={resolve('/')}>
				<LogoMark />
				Prizen
			</a>
			<ThemeToggle />
		</div>
	</header>

	<main class="page-shell py-7">
		<Button href={resolve('/dashboard')} variant="ghost" class="-ml-2 text-slate-600">
			<ArrowLeft aria-hidden="true" size={16} />Back to dashboard
		</Button>

		<div class="mt-5">
			<p class="text-sm font-bold tracking-[0.16em] text-indigo-600 uppercase">Settings</p>
			<h1 class="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Local settings</h1>
			<p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
				Configure this device's delivery location, marketplace connections, and notifications.
			</p>
		</div>

		<div class="mt-8 grid items-start gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
			<aside
				class="sticky top-4 z-10 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:top-6"
				aria-label="Settings sections"
			>
				<nav class="flex min-w-max gap-1 lg:min-w-0 lg:flex-col">
					<a
						class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition {activeSection ===
						'marketplaces'
							? 'bg-indigo-50 text-indigo-700'
							: 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}"
						href={resolve('/settings/marketplaces')}
						aria-current={activeSection === 'marketplaces' ? 'page' : undefined}
					>
						<ShoppingBag aria-hidden="true" size={16} />Marketplaces
					</a>
					<a
						class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition {activeSection ===
						'delivery'
							? 'bg-indigo-50 text-indigo-700'
							: 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}"
						href={resolve('/settings/delivery')}
						aria-current={activeSection === 'delivery' ? 'page' : undefined}
					>
						<MapPin aria-hidden="true" size={16} />Delivery
					</a>
					<a
						class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition {activeSection ===
						'notifications'
							? 'bg-indigo-50 text-indigo-700'
							: 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}"
						href={resolve('/settings/notifications')}
						aria-current={activeSection === 'notifications' ? 'page' : undefined}
					>
						<Bell aria-hidden="true" size={16} />Notifications
					</a>
				</nav>
			</aside>

			<div class="min-w-0">
				{#if activeSection === 'marketplaces'}
					<section
						id="marketplaces"
						class="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
					>
						<div class="border-b border-slate-100 px-5 py-4 sm:px-6">
							<h2 class="text-lg font-black">Marketplace accounts</h2>
							<p class="mt-1 text-sm text-slate-500">Manage the stores Prizen can assist with.</p>
						</div>
						<div class="flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
							<div class="flex items-start gap-3">
								<span class="rounded-xl bg-violet-100 p-2.5 text-violet-700">
									<ShoppingBag aria-hidden="true" size={20} />
								</span>
								<div>
									<h3 class="font-bold">Browser extension connection</h3>
									<p class="mt-1 max-w-2xl text-sm text-slate-500">
										Auto-buy connections will be paired here through the local browser extension.
										Your marketplace password, cookies, and payment details stay in your browser.
									</p>
								</div>
							</div>
							<span
								class="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800"
							>
								<ShieldCheck aria-hidden="true" size={14} />Extension pairing coming next
							</span>
						</div>
					</section>
				{:else if activeSection === 'delivery'}
					<section
						id="delivery"
						class="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
					>
						<div class="border-b border-slate-100 px-5 py-4 sm:px-6">
							<h2 class="text-lg font-black">Delivery location</h2>
							<p class="mt-1 text-sm text-slate-500">
								Used to check whether products can be delivered to you.
							</p>
						</div>
						<div class="p-5 sm:p-6">
							<div class="flex items-start gap-3">
								<span class="rounded-xl bg-indigo-100 p-2.5 text-indigo-700">
									<MapPin aria-hidden="true" size={20} />
								</span>
								<div>
									<h3 class="font-bold">Amazon India</h3>
									<p class="mt-1 text-sm text-slate-500">
										Availability checks use this pincode to match Amazon's delivery location.
									</p>
								</div>
							</div>
							<form
								class="mt-5 flex max-w-lg flex-col gap-3 sm:flex-row sm:items-end"
								onsubmit={(event) => {
									event.preventDefault();
									savePincode();
								}}
							>
								<label class="min-w-0 flex-1 text-sm font-semibold">
									Delivery pincode
									<input
										class="mt-2 w-full rounded-xl border-slate-300"
										bind:value={deliveryPincode}
										inputmode="numeric"
										pattern="[0-9]{6}"
										maxlength="6"
										placeholder="560001"
										required
									/>
								</label>
								<Button
									class="h-10 bg-indigo-600 px-4 text-white hover:bg-indigo-700"
									disabled={savingPincode}
								>
									{savingPincode ? 'Saving…' : 'Save location'}
								</Button>
							</form>
							{#if pincodeMessage}<p class="mt-3 text-sm font-semibold text-slate-600">
									{pincodeMessage}
								</p>{/if}
						</div>
					</section>
				{:else}
					<section
						id="notifications"
						class="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
					>
						<div
							class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6"
						>
							<div>
								<h2 class="text-lg font-black">Notifications</h2>
								<p class="mt-1 text-sm text-slate-500">Manage where Prizen sends deal alerts.</p>
							</div>
							<span
								class="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700"
							>
								{channels.length} connected
							</span>
						</div>

						<div class="p-5 sm:p-6">
							<h3 class="font-bold">Connected channels</h3>
							{#if loading}
								<p class="mt-6 text-sm text-slate-500">Loading integrations…</p>
							{:else if channels.length === 0}
								<div class="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center">
									<MessageCircle class="mx-auto text-slate-400" aria-hidden="true" size={24} />
									<p class="mt-3 text-sm font-semibold">No notification channels connected yet.</p>
								</div>
							{:else}
								<div class="mt-5 space-y-3">
									{#each channels as channel (channel.id)}
										<div class="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
											<div class="min-w-0">
												<div class="flex flex-wrap items-center gap-2">
													<p class="truncate text-sm font-bold">{channel.label}</p>
													<span
														class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700"
														><CircleCheck aria-hidden="true" size={12} />{channel.isVerified
															? 'Verified'
															: 'Unverified'}</span
													>
												</div>
												<p class="mt-1 text-xs text-slate-500 capitalize">{channel.provider}</p>
											</div>
											<Button
												variant="ghost"
												size="icon"
												class="text-rose-600 hover:bg-rose-100 hover:text-rose-700"
												aria-label={`Remove ${channel.label}`}
												title={`Remove ${channel.label}`}
												onclick={() => removeChannel(channel)}
												><Trash2 aria-hidden="true" size={16} /></Button
											>
										</div>
									{/each}
								</div>
							{/if}

							<div class="my-6 border-t border-slate-100"></div>
							<h3 class="font-bold">Add an integration</h3>
							<p class="mt-1 text-sm text-slate-500">
								A test notification will be sent before the channel is saved.
							</p>

							<div class="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5" role="tablist">
								<button
									type="button"
									role="tab"
									aria-selected={activeProvider === 'discord'}
									aria-controls="discord-form"
									class="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition {activeProvider ===
									'discord'
										? 'bg-white text-indigo-700 shadow-sm'
										: 'text-slate-500 hover:text-slate-900'}"
									onclick={() => (activeProvider = 'discord')}
								>
									<MessageCircle aria-hidden="true" size={18} />Discord
								</button>
								<button
									type="button"
									role="tab"
									aria-selected={activeProvider === 'telegram'}
									aria-controls="telegram-form"
									class="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition {activeProvider ===
									'telegram'
										? 'bg-white text-sky-700 shadow-sm'
										: 'text-slate-500 hover:text-slate-900'}"
									onclick={() => (activeProvider = 'telegram')}
								>
									<Send aria-hidden="true" size={18} />Telegram
								</button>
							</div>

							{#if activeProvider === 'discord'}
								<form
									id="discord-form"
									class="mt-5"
									onsubmit={(event) => {
										event.preventDefault();
										saveChannel('discord');
									}}
								>
									<div class="grid gap-4 sm:grid-cols-2">
										<label class="text-sm font-semibold">
											Label
											<input
												class="mt-2 w-full rounded-xl border-slate-300"
												bind:value={discordLabel}
												placeholder="Discord alerts"
												required
											/>
										</label>
										<label class="text-sm font-semibold">
											Discord webhook URL
											<input
												class="mt-2 w-full rounded-xl border-slate-300"
												bind:value={discordWebhook}
												placeholder="https://discord.com/api/webhooks/..."
												type="url"
												required
											/>
										</label>
									</div>
									<Button
										class="mt-5 h-10 bg-indigo-600 px-4 text-white hover:bg-indigo-700"
										disabled={saving}
									>
										<MessageCircle aria-hidden="true" size={16} />{saving
											? 'Verifying…'
											: 'Connect Discord'}
									</Button>
								</form>
							{:else}
								<form
									id="telegram-form"
									class="mt-5"
									onsubmit={(event) => {
										event.preventDefault();
										saveChannel('telegram');
									}}
								>
									<div class="grid gap-4 sm:grid-cols-2">
										<label class="text-sm font-semibold">
											Label
											<input
												class="mt-2 w-full rounded-xl border-slate-300"
												bind:value={telegramLabel}
												placeholder="Telegram alerts"
												required
											/>
										</label>
										<label class="text-sm font-semibold">
											Telegram chat ID
											<input
												class="mt-2 w-full rounded-xl border-slate-300"
												bind:value={telegramChatId}
												placeholder="For example: 123456789"
												required
											/>
										</label>
									</div>
									<label class="mt-4 block text-sm font-semibold">
										Telegram bot token
										<input
											class="mt-2 w-full rounded-xl border-slate-300"
											bind:value={telegramBotToken}
											placeholder="123456:ABC..."
											type="password"
											required
										/>
									</label>
									<Button
										class="mt-5 h-10 bg-sky-600 px-4 text-white hover:bg-sky-700"
										disabled={saving}
									>
										<Send aria-hidden="true" size={16} />{saving
											? 'Verifying…'
											: 'Connect Telegram'}
									</Button>
								</form>
							{/if}

							{#if message}
								<p
									class="mt-4 text-sm font-semibold {isError
										? 'text-rose-700'
										: 'text-emerald-700'}"
								>
									{message}
								</p>
							{/if}
						</div>
					</section>
				{/if}
			</div>
		</div>
	</main>
</div>
