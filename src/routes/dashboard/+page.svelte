<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import LogoMark from '$lib/components/logo-mark.svelte';
	import TrackedProductCard from '$lib/components/tracked-product-card.svelte';
	import ProductPagination from '$lib/components/product-pagination.svelte';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import { pollingOptions, type TrackedProduct as Product } from '$lib/types/tracking';
	import { Bell, Plus, Settings, Trash2, X } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const key = $derived(`prizen-tracked-products:${data.user?.id ?? 'anonymous'}`);
	const pageSize = 6;

	let products = $state<Product[]>([]);
	let ready = $state(false);
	let showAdd = $state(false);
	let url = $state('');
	let addError = $state('');
	let adding = $state(false);
	let deleting = $state<Product | null>(null);
	let pollingSeconds = $state(900);
	let now = $state(Date.now());
	let page = $state(1);
	const pageCount = $derived(Math.max(1, Math.ceil(products.length / pageSize)));
	const visibleProducts = $derived(products.slice((page - 1) * pageSize, page * pageSize));

	function normalizeProducts(value: unknown): Product[] {
		if (!Array.isArray(value)) return [];
		return value.flatMap((item) => {
			if (!item || typeof item !== 'object') return [];
			const legacy = item as Partial<Product> & { currentPrice?: unknown };
			if (
				typeof legacy.id !== 'string' ||
				typeof legacy.title !== 'string' ||
				typeof legacy.url !== 'string'
			)
				return [];
			const history = Array.isArray(legacy.history)
				? legacy.history
				: typeof legacy.currentPrice === 'number'
					? [{ price: legacy.currentPrice, observedAt: new Date().toISOString() }]
					: [];
			const createdAt =
				typeof legacy.createdAt === 'string' && !Number.isNaN(new Date(legacy.createdAt).getTime())
					? legacy.createdAt
					: (history[0]?.observedAt ?? 'Added earlier');
			return history.length > 0
				? [
						{
							id: legacy.id,
							title: legacy.title,
							url: legacy.url,
							currency: legacy.currency ?? 'INR',
							history,
							pollingSeconds:
								typeof legacy.pollingSeconds === 'number' ? legacy.pollingSeconds : 900,
							createdAt,
							targetPrice: typeof legacy.targetPrice === 'number' ? legacy.targetPrice : null,
							availability:
								legacy.availability === 'out_of_stock' || legacy.availability === 'unknown'
									? legacy.availability
									: 'in_stock',
							failureCount: typeof legacy.failureCount === 'number' ? legacy.failureCount : 0
						}
					]
				: [];
		});
	}
	async function loadPersistedProducts() {
		try {
			const response = await fetch('/api/tracking');
			if (!response.ok) return;
			products = normalizeProducts(await response.json());
		} catch {
			/* Local history remains available while the server is starting or unavailable. */
		}
	}

	onMount(() => {
		const saved = localStorage.getItem(key);
		if (saved !== null)
			try {
				products = normalizeProducts(JSON.parse(saved));
			} catch {
				localStorage.removeItem(key);
			}
		ready = true;
		void loadPersistedProducts();
		const refresh = window.setInterval(() => void loadPersistedProducts(), 30_000);
		const clock = window.setInterval(() => (now = Date.now()), 60_000);
		return () => {
			window.clearInterval(refresh);
			window.clearInterval(clock);
		};
	});
	$effect(() => {
		if (browser && ready) localStorage.setItem(key, JSON.stringify(products));
	});

	async function readProduct(productUrl: string) {
		const response = await fetch('/api/products/preview', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ url: productUrl })
		});
		const data = (await response.json()) as {
			title?: string;
			url?: string;
			currentPrice?: number;
			currency?: string;
			message?: string;
		};
		if (!response.ok || !data.title || !data.url || data.currentPrice === undefined)
			throw new Error(data.message ?? 'We could not read this product page.');
		return data as { title: string; url: string; currentPrice: number; currency: string };
	}

	async function addProduct() {
		if (!url.trim() || adding) return;
		adding = true;
		addError = '';
		try {
			const data = await readProduct(url);
			const trackingResponse = await fetch('/api/tracking', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ...data, pollingSeconds })
			});
			const tracking = (await trackingResponse.json()) as { id?: string; message?: string };
			if (!trackingResponse.ok || !tracking.id) {
				throw new Error(tracking.message ?? 'Prizen could not save this tracker.');
			}
			products = [
				...products,
				{
					id: tracking.id,
					title: data.title,
					url: data.url,
					currency: data.currency ?? 'INR',
					history: [{ price: data.currentPrice, observedAt: new Date().toISOString() }],
					pollingSeconds,
					createdAt: new Date().toISOString(),
					targetPrice: null,
					availability: 'in_stock',
					failureCount: 0
				}
			];
			page = 1;
			url = '';
			pollingSeconds = 900;
			showAdd = false;
		} catch (exception) {
			addError = exception instanceof Error ? exception.message : 'We could not add this product.';
		} finally {
			adding = false;
		}
	}
	async function deleteProduct() {
		if (!deleting) return;
		try {
			const response = await fetch(`/api/tracking/${deleting.id}`, { method: 'DELETE' });
			if (!response.ok && response.status !== 404) throw new Error('Delete failed.');
			const remaining = products.filter((product) => product.id !== deleting?.id);
			products = remaining;
			page = Math.min(page, Math.max(1, Math.ceil(remaining.length / pageSize)));
		} finally {
			deleting = null;
		}
	}
	async function saveTargetPrice(product: Product, rawValue: string) {
		const parsed = rawValue.trim() === '' ? null : Number(rawValue);
		if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0)) return;
		const response = await fetch(`/api/tracking/${product.id}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ targetPrice: parsed })
		});
		if (!response.ok) return;
		products = products.map((item) =>
			item.id === product.id ? { ...item, targetPrice: parsed } : item
		);
	}
	async function savePollingSeconds(product: Product, seconds: number) {
		const response = await fetch(`/api/tracking/${product.id}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ pollingSeconds: seconds })
		});
		if (!response.ok) return;
		products = products.map((item) =>
			item.id === product.id ? { ...item, pollingSeconds: seconds } : item
		);
	}
</script>

<svelte:head><title>Dashboard — Prizen</title></svelte:head>
<div class="app-surface min-h-screen bg-[#f8f9ff] text-slate-950">
	<header class="dashboard-nav border-b border-slate-200 bg-white">
		<div class="page-shell flex items-center justify-between py-4">
			<a class="flex items-center gap-2 text-xl font-black tracking-tight" href={resolve('/')}>
				<LogoMark />Prizen
			</a>
			<div class="flex items-center gap-3">
				<ThemeToggle />
				<Button
					href={resolve('/settings')}
					variant="outline"
					size="icon-lg"
					class="border-slate-200 bg-white text-slate-700 hover:border-slate-300"
					aria-label="Notification integrations"
					title="Notification integrations"><Bell aria-hidden="true" size={18} /></Button
				>
				<Button
					href={resolve('/settings')}
					variant="outline"
					size="icon-lg"
					class="border-slate-200 bg-white text-slate-700 hover:border-slate-300"
					aria-label="Settings"
					title="Settings"><Settings aria-hidden="true" size={18} /></Button
				>
			</div>
		</div>
	</header>
	<main class="page-shell py-7">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class="text-sm font-bold tracking-[0.16em] text-indigo-600 uppercase">Your dashboard</p>
				<h1 class="mt-2 text-4xl font-black tracking-tight">Tracked products</h1>
			</div>
			<div class="flex items-center gap-3">
				<p
					class="rounded-full border border-slate-300 bg-transparent px-3 py-1.5 text-sm font-bold text-slate-600"
				>
					{products.length}
					{products.length === 1 ? 'product' : 'products'}
				</p>
				<Button
					class="h-10 bg-indigo-600 px-4 text-white shadow-sm hover:bg-indigo-700"
					onclick={() => (showAdd = true)}
					><Plus aria-hidden="true" size={17} />Track product</Button
				>
			</div>
		</div>
		{#if products.length === 0}<section
				class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"
			>
				<h2 class="text-2xl font-black">Your list is clear.</h2>
				<p class="mx-auto mt-3 max-w-md text-slate-600">
					Paste an Amazon product link to start a new price history.
				</p>
				<button
					class="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
					onclick={() => (showAdd = true)}>Track a product</button
				>
			</section>{:else}<section class="mt-5 grid gap-4">
				{#each visibleProducts as product (product.id)}
					<TrackedProductCard
						{product}
						{pollingOptions}
						{now}
						onDelete={(value) => (deleting = value)}
						onTargetPriceChange={saveTargetPrice}
						onPollingChange={savePollingSeconds}
					/>
				{/each}
			</section>
			<ProductPagination {page} {pageCount} onPageChange={(value) => (page = value)} />
		{/if}
	</main>
</div>
{#if showAdd}<div
		class="fixed inset-0 z-10 grid place-items-center bg-slate-950/40 p-5"
		role="dialog"
		aria-modal="true"
		aria-labelledby="add-heading"
	>
		<form
			class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
			onsubmit={(event) => {
				event.preventDefault();
				addProduct();
			}}
		>
			<div class="flex items-start justify-between gap-4">
				<div>
					<h2 id="add-heading" class="text-xl font-black">Track an Amazon product</h2>
					<p class="mt-1 text-sm text-slate-500">
						Paste the link, then choose how often the background tracker checks it.
					</p>
				</div>
				<button
					type="button"
					class="rounded-lg px-2 text-xl text-slate-400 hover:bg-slate-100"
					aria-label="Close"
					title="Close"
					onclick={() => (showAdd = false)}><X aria-hidden="true" size={20} /></button
				>
			</div>
			<label class="mt-5 block text-sm font-semibold" for="url">Amazon product link</label><input
				id="url"
				class="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 focus:border-indigo-500 focus:ring-indigo-500"
				bind:value={url}
				placeholder="https://www.amazon.in/..."
				type="url"
				required
			/>{#if addError}<p class="mt-3 text-sm font-medium text-rose-700">{addError}</p>{/if}
			<label class="mt-4 block text-sm font-semibold" for="polling">Polling interval</label><select
				id="polling"
				class="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 focus:border-indigo-500 focus:ring-indigo-500"
				bind:value={pollingSeconds}
				>{#each pollingOptions as option (option.seconds)}<option value={option.seconds}
						>{option.label}</option
					>{/each}</select
			>
			<div class="mt-6 flex justify-end gap-3">
				<button
					type="button"
					class="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
					onclick={() => (showAdd = false)}>Cancel</button
				><button
					class="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
					disabled={adding}>{adding ? 'Reading product…' : 'Track product'}</button
				>
			</div>
		</form>
	</div>{/if}
{#if deleting}<div
		class="fixed inset-0 z-10 grid place-items-center bg-slate-950/40 p-5"
		role="dialog"
		aria-modal="true"
		aria-labelledby="delete-heading"
	>
		<div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
			<h2 id="delete-heading" class="text-xl font-black">Delete this product?</h2>
			<p class="mt-2 text-sm leading-6 text-slate-600">
				<strong>{deleting.title}</strong> and all of its local price history will be permanently removed
				from this browser. This cannot be undone.
			</p>
			<div class="mt-6 flex justify-end gap-3">
				<button
					class="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
					onclick={() => (deleting = null)}>Cancel</button
				><button
					class="rounded-xl bg-rose-600 p-2.5 text-white hover:bg-rose-700"
					aria-label="Delete permanently"
					title="Delete permanently"
					onclick={deleteProduct}><Trash2 aria-hidden="true" size={18} /></button
				>
			</div>
		</div>
	</div>{/if}
