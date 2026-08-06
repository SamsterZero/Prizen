<script lang="ts">
	import * as Chart from '$lib/components/ui/chart';
	import { AreaChart } from 'layerchart';
	import { SvelteDate } from 'svelte/reactivity';

	type Observation = { price: number; observedAt: string };
	type Range = 1 | 7 | 30 | 90;
	const rangeOptions: { days: Range; label: string }[] = [
		{ days: 1, label: '24hr' },
		{ days: 7, label: '7D' },
		{ days: 30, label: '30D' },
		{ days: 90, label: '90D' }
	];
	let { observations, large = false }: { observations: Observation[]; large?: boolean } = $props();
	let range = $state<Range>(1);
	const visible = $derived.by(() => {
		const cutoff = Date.now() - range * 86_400_000;
		return observations.filter((item) => new Date(item.observedAt).getTime() >= cutoff);
	});
	const data = $derived(
		visible.map((item) => ({ time: new Date(item.observedAt), price: item.price }))
	);
	const hourFormatter = new Intl.DateTimeFormat('en-IN', { hour: 'numeric' });
	const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
	const xDomain = $derived.by(() => {
		const end = new Date();
		return [new Date(end.getTime() - range * 86_400_000), end];
	});
	function createTicks(step: number, unit: 'hour' | 'day') {
		const tick = new SvelteDate(xDomain[0]);
		if (unit === 'hour') {
			tick.setMinutes(0, 0, 0);
			tick.setHours(Math.ceil(tick.getHours() / step) * step);
		} else {
			tick.setHours(0, 0, 0, 0);
			tick.setDate(tick.getDate() + 1);
		}
		const ticks: Date[] = [];
		while (tick <= xDomain[1]) {
			ticks.push(new Date(tick));
			if (unit === 'hour') tick.setHours(tick.getHours() + step);
			else tick.setDate(tick.getDate() + step);
		}
		return ticks;
	}
	const xAxis = $derived.by(() => {
		if (range === 1) {
			return {
				format: (value: Date | string | number) => hourFormatter.format(new Date(value)),
				ticks: createTicks(6, 'hour')
			};
		}
		return {
			format: (value: Date | string | number) => dateFormatter.format(new Date(value)),
			ticks: createTicks(range === 7 ? 1 : range === 30 ? 5 : 30, 'day')
		};
	});
	const config = { price: { label: 'Price', color: 'var(--chart-1)' } } satisfies Chart.ChartConfig;
</script>

<div class="price-chart">
	<div class="flex items-center justify-between gap-2">
		<p class="text-xs font-semibold text-muted-foreground">Price history</p>
		<label>
			<span class="sr-only">Price history range</span>
			<select
				class="h-8 rounded-lg border-slate-300 bg-white py-1 pr-8 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-[#131316] dark:text-slate-200"
				value={range}
				onchange={(event) => (range = Number(event.currentTarget.value) as Range)}
			>
				{#each rangeOptions as option (option.days)}
					<option value={option.days}>{option.label}</option>
				{/each}
			</select>
		</label>
	</div>
	{#if data.length > 0}
		<Chart.Container
			{config}
			class="mt-3 !aspect-auto min-h-0 w-full [&_.lc-root-container]:h-full {large
				? 'h-72'
				: 'h-20'}"
		>
			<AreaChart
				{data}
				{xDomain}
				x="time"
				y="price"
				axis="x"
				props={{ xAxis }}
				tooltipContext={false}
				series={[{ key: 'price', label: 'Price', color: config.price.color }]}
			/></Chart.Container
		>
	{:else}<p class="mt-5 text-xs text-muted-foreground">No prices in this range.</p>{/if}
</div>
