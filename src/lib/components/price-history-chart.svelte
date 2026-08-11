<script lang="ts">
	import * as Chart from '$lib/components/ui/chart';
	import { AreaChart } from 'layerchart';
	import { SvelteDate } from 'svelte/reactivity';
	import { analyticsRanges, type AnalyticsRange } from '$lib/modules/tracker/analytics';

	type Observation = { price: number; observedAt: string };
	let {
		observations,
		range,
		large = false
	}: { observations: Observation[]; range: AnalyticsRange; large?: boolean } = $props();
	const data = $derived(
		observations.map((item) => ({ time: new Date(item.observedAt), price: item.price }))
	);
	const hourFormatter = new Intl.DateTimeFormat('en-IN', { hour: 'numeric' });
	const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
	const xDomain = $derived.by(() => {
		const end = new Date();
		return [new Date(end.getTime() - analyticsRanges[range].milliseconds), end];
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
		if (range === '24h') {
			return {
				format: (value: Date | string | number) => hourFormatter.format(new Date(value)),
				ticks: createTicks(6, 'hour')
			};
		}
		return {
			format: (value: Date | string | number) => dateFormatter.format(new Date(value)),
			ticks: createTicks(range === '7d' ? 1 : range === '30d' ? 5 : 30, 'day')
		};
	});
	const config = { price: { label: 'Price', color: 'var(--chart-1)' } } satisfies Chart.ChartConfig;
</script>

<div class="price-chart">
	<p class="text-xs font-semibold text-muted-foreground">Price history</p>
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
