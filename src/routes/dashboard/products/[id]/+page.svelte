<script lang="ts">
	import { resolve } from '$app/paths';
	import LogoMark from '$lib/components/logo-mark.svelte';
	import PriceHistoryChart from '$lib/components/price-history-chart.svelte';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, CircleCheck, CircleX, ExternalLink, ListChecks } from '@lucide/svelte';
	import type { PageProps } from './$types';
	import { analyticsRanges, type AnalyticsRange } from '$lib/modules/tracker/analytics';

	let { data }: PageProps = $props();
	const product = $derived(data.product);
	const money = $derived(
		new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: product.currency,
			maximumFractionDigits: 0
		})
	);
	const current = $derived(product.analytics.currentPrice);
	const lowest = $derived(product.analytics.lowestPrice);
	function changeRange(value: string) {
		const range = value as AnalyticsRange;
		window.location.assign(`${window.location.pathname}?range=${range}`);
	}
	const pollingLabel = $derived(
		product.pollingSeconds < 60
			? `${product.pollingSeconds} seconds`
			: product.pollingSeconds < 3600
				? `${product.pollingSeconds / 60} minutes`
				: `${product.pollingSeconds / 3600} hour`
	);
</script>

<svelte:head>
	<title>{product.title} — Tracking details</title>
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
		<div class="flex items-center justify-between gap-3">
			<Button href={resolve('/dashboard')} variant="ghost" class="-ml-2 text-slate-600">
				<ArrowLeft aria-hidden="true" size={16} />Back to dashboard
			</Button>
			<Button
				href={product.url}
				target="_blank"
				rel="noopener noreferrer"
				variant="outline"
				class="h-10 border-violet-500/60 px-3.5 text-violet-600 hover:bg-violet-600 hover:text-white"
				>Visit product <ExternalLink aria-hidden="true" size={15} /></Button
			>
		</div>

		<section class="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-xs font-bold tracking-[0.14em] text-indigo-600 uppercase">
					{product.marketplace.name}
				</p>
				<label class="text-xs font-bold text-slate-500">
					<span class="mr-2">Analytics range</span>
					<select
						class="h-9 rounded-lg border-slate-300 bg-slate-50 pr-8 text-sm font-semibold text-slate-700"
						value={product.analyticsRange}
						onchange={(event) => changeRange(event.currentTarget.value)}
					>
						{#each Object.entries(analyticsRanges) as [value, option] (value)}
							<option {value}>{option.label}</option>
						{/each}
					</select>
				</label>
			</div>
			<h1 class="mt-2 w-full text-2xl font-black tracking-tight md:text-3xl">{product.title}</h1>

			<div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
				<div class="rounded-xl bg-slate-50 p-4">
					<p class="text-xs font-semibold text-slate-500">Current price</p>
					<p class="mt-1 text-2xl font-black">
						{current === null ? 'No data' : money.format(current)}
					</p>
				</div>
				<div class="rounded-xl bg-slate-50 p-4">
					<p class="text-xs font-semibold text-slate-500">Lowest seen</p>
					<p class="mt-1 text-lg font-black text-emerald-600">
						{lowest === null ? 'No data' : money.format(lowest)}
					</p>
				</div>
				<div class="rounded-xl bg-slate-50 p-4">
					<p class="text-xs font-semibold text-slate-500">Target price</p>
					<p class="mt-1 text-lg font-black">
						{product.targetPrice === null ? 'Not set' : money.format(product.targetPrice)}
					</p>
				</div>
				<div class="rounded-xl bg-slate-50 p-4">
					<p class="text-xs font-semibold text-slate-500">Check frequency</p>
					<p class="mt-1 text-lg font-black">Every {pollingLabel}</p>
				</div>
				<div class="rounded-xl bg-slate-50 p-4">
					<p class="text-xs font-semibold text-slate-500">Availability</p>
					<span
						class="mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold {product.availability ===
						'out_of_stock'
							? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
							: product.availability === 'unknown'
								? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
								: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}"
					>
						{product.availability === 'out_of_stock'
							? 'Out of stock'
							: product.availability === 'unknown'
								? 'Unknown'
								: 'In stock'}
					</span>
				</div>
			</div>

			<div class="mt-6 flex flex-wrap items-center gap-2 text-xs font-bold">
				<span
					class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
					><ListChecks aria-hidden="true" size={13} />{product.analytics.observationCount} observations
					in range</span
				>
				<span
					class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
					><CircleCheck aria-hidden="true" size={13} />{product.analytics.observationCount} successful</span
				>
				<span
					class="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
					><CircleX aria-hidden="true" size={13} />{product.failureCount} failed</span
				>
			</div>
			<div class="mt-4 grid gap-3 sm:grid-cols-2">
				<div class="rounded-xl border border-slate-200 p-4">
					<p class="text-xs font-semibold text-slate-500">Price trend</p>
					<p class="mt-1 text-lg font-black">
						{product.analytics.changePercent === null
							? 'Not enough data'
							: `${product.analytics.changePercent > 0 ? '+' : ''}${product.analytics.changePercent.toFixed(1)}%`}
					</p>
				</div>
				<div class="rounded-xl border border-slate-200 p-4">
					<p class="text-xs font-semibold text-slate-500">Price volatility</p>
					<p class="mt-1 text-lg font-black">
						{product.analytics.volatilityPercent === null
							? 'Needs 3 observations'
							: `${product.analytics.volatilityPercent.toFixed(1)}%`}
					</p>
				</div>
			</div>
		</section>

		<section class="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
			<PriceHistoryChart observations={product.history} range={product.analyticsRange} large />
		</section>
	</main>
</div>
