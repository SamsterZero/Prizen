<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import type { TrackedProduct } from '$lib/types/tracking';
	import {
		ChartLine,
		CircleCheck,
		CircleX,
		ExternalLink,
		ListChecks,
		Trash2
	} from '@lucide/svelte';

	let {
		product,
		pollingOptions,
		now,
		onDelete,
		onTargetPriceChange,
		onPollingChange
	}: {
		product: TrackedProduct;
		pollingOptions: { seconds: number; label: string }[];
		now: number;
		onDelete: (product: TrackedProduct) => void;
		onTargetPriceChange: (product: TrackedProduct, value: string) => void;
		onPollingChange: (product: TrackedProduct, seconds: number) => void;
	} = $props();

	const money = $derived(
		new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: product.currency,
			maximumFractionDigits: 0
		})
	);
	const current = $derived(product.analytics.currentPrice);
	const lowest = $derived(product.analytics.lowestPrice);
	const addedAt = $derived.by(() => {
		const minutes = Math.floor((now - new Date(product.createdAt).getTime()) / 60_000);
		if (!Number.isFinite(minutes)) return product.createdAt;
		if (minutes < 1) return 'Added just now';
		if (minutes < 60) return `Added ${minutes} min${minutes === 1 ? '' : 's'} ago`;
		const hours = Math.floor(minutes / 60);
		return hours < 24
			? `Added ${hours} hr${hours === 1 ? '' : 's'} ago`
			: `Added ${Math.floor(hours / 24)} days ago`;
	});
</script>

<article
	class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 dark:bg-[#0e0e11]"
>
	<header class="flex w-full items-center justify-between gap-3 border-b border-slate-200 pb-3">
		<p class="text-xs font-bold tracking-[0.14em] text-indigo-600 uppercase">
			{product.marketplace.name}
		</p>
		<Button
			variant="ghost"
			size="icon"
			class="size-8 shrink-0 rounded-lg text-slate-500 hover:bg-rose-500/15 hover:text-rose-500"
			aria-label={`Delete ${product.title}`}
			title={`Delete ${product.title}`}
			onclick={() => onDelete(product)}><Trash2 aria-hidden="true" size={16} /></Button
		>
	</header>

	<div
		class="mt-4 grid min-w-0 gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(16rem,1.3fr)_auto_minmax(17rem,1fr)_auto] xl:items-end"
	>
		<div class="min-w-0 xl:self-start">
			<button
				class="product-title text-left text-base leading-snug font-extrabold text-slate-950 hover:text-indigo-700 md:text-lg"
				onclick={() => window.open(product.url, '_blank', 'noopener,noreferrer')}
				>{product.title}</button
			>
			<div class="mt-4 flex items-center justify-between gap-3">
				<div class="flex flex-wrap items-center gap-1.5 text-xs font-bold">
					<span
						class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
						title="Observations in selected range"
						><ListChecks aria-hidden="true" size={13} />{product.analytics.observationCount} in range</span
					>
					<span
						class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
						title="Successful observations in selected range"
						><CircleCheck aria-hidden="true" size={13} />{product.analytics.observationCount}</span
					>
					<span
						class="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
						title="Failed polls"
						><CircleX aria-hidden="true" size={13} />{product.failureCount}</span
					>
				</div>
				<p class="shrink-0 text-right text-xs font-medium text-slate-500">{addedAt}</p>
			</div>
		</div>

		<div class="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2 xl:block">
			<p class="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
				{current === null ? 'No price' : money.format(current)}
			</p>
			<span
				class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold xl:mt-2 {product.availability ===
				'out_of_stock'
					? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
					: product.availability === 'unknown'
						? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
						: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}"
			>
				{product.availability === 'out_of_stock'
					? 'Out of stock'
					: product.availability === 'unknown'
						? 'Availability unknown'
						: 'In stock'}
			</span>
			{#if lowest !== null}
				<p class="text-sm font-bold text-emerald-600 xl:mt-2">Lowest {money.format(lowest)}</p>
			{/if}
			<p class="mt-1 text-xs font-semibold text-slate-500">
				{product.analytics.changePercent === null
					? product.analytics.observationCount === 0
						? 'No observations in this range'
						: 'More observations needed for a trend'
					: `${product.analytics.changePercent > 0 ? '+' : ''}${product.analytics.changePercent.toFixed(1)}% trend`}
				{#if product.analytics.volatilityPercent !== null}
					· {product.analytics.volatilityPercent.toFixed(1)}% volatility
				{/if}
			</p>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<div class="min-w-0">
				<label class="block text-xs font-bold text-slate-600" for={`target-${product.id}`}
					>Target price</label
				>
				<div
					class="mt-2 flex h-10 items-center rounded-lg border border-slate-300 bg-slate-50 px-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 dark:bg-[#131316]"
				>
					<span class="mr-1 text-sm font-bold text-slate-500">₹</span><input
						id={`target-${product.id}`}
						class="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-slate-950 focus:ring-0"
						type="number"
						min="1"
						step="0.01"
						value={product.targetPrice ?? ''}
						placeholder="Set target"
						aria-label={`Target price for ${product.title}`}
						onchange={(event) => onTargetPriceChange(product, event.currentTarget.value)}
					/>
				</div>
			</div>
			<div class="min-w-0">
				<label class="block text-xs font-bold text-slate-600" for={`poll-${product.id}`}
					>Frequency</label
				>
				<select
					id={`poll-${product.id}`}
					class="mt-2 h-10 w-full rounded-lg border-slate-300 bg-slate-50 py-1.5 pr-7 text-sm font-semibold text-slate-950 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-[#131316]"
					value={product.pollingSeconds}
					onchange={(event) => onPollingChange(product, Number(event.currentTarget.value))}
				>
					{#each pollingOptions as option (option.seconds)}
						<option value={option.seconds}>Every {option.label}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="flex min-w-0 flex-col gap-2 sm:max-w-48 lg:justify-self-end xl:w-44">
			<Button
				href={resolve('/dashboard/products/[id]', { id: product.id })}
				class="h-10 w-full bg-indigo-600 px-4 text-white hover:bg-indigo-700"
				><ChartLine aria-hidden="true" size={16} />Tracking details</Button
			>
			<Button
				variant="outline"
				class="h-10 w-full border-violet-500/60 px-3.5 text-violet-600 hover:bg-violet-600 hover:text-white dark:text-violet-300"
				onclick={() => window.open(product.url, '_blank', 'noopener,noreferrer')}
				>Visit product <ExternalLink aria-hidden="true" size={15} /></Button
			>
		</div>
	</div>
</article>
