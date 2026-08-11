<script lang="ts">
	import { resolve } from '$app/paths';
	import AppNav from '$lib/components/app-nav.svelte';
	import { BellRing, ChartNoAxesCombined, LockKeyhole, ShoppingBag } from '@lucide/svelte';
</script>

<svelte:head>
	<title>About Prizen</title>
	<meta name="description" content="Learn how the local-first Prizen price tracker works." />
</svelte:head>

<div class="app-surface min-h-screen bg-[#f8f9ff] text-slate-950">
	<AppNav />

	<main class="page-shell py-12 sm:py-16">
		<section class="max-w-3xl">
			<p class="text-sm font-bold tracking-[0.16em] text-indigo-600 uppercase">About Prizen</p>
			<h1 class="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
				A calmer way to watch prices.
			</h1>
			<p class="mt-5 text-lg leading-8 text-slate-600">
				Prizen is a local-first, self-hosted tool for tracking marketplace products, understanding
				their price history, and reacting quickly when a worthwhile deal appears.
			</p>
		</section>

		<section class="mt-12 grid gap-4 sm:grid-cols-2">
			{#each [{ icon: ChartNoAxesCombined, title: 'Track the signal', copy: 'Compare the current price with previous observations, record lows, and your own target.' }, { icon: BellRing, title: 'Receive useful alerts', copy: 'Connect Discord or Telegram and get notified when a product reaches a meaningful price event.' }, { icon: LockKeyhole, title: 'Keep control locally', copy: 'Prizen runs on your device and stores its operational data in your own local PostgreSQL container.' }, { icon: ShoppingBag, title: 'Grow across marketplaces', copy: 'Marketplace adapters keep tracking and future Buy Assist features independent from any single store.' }] as feature (feature.title)}
				<article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<span class="grid size-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700"
						><feature.icon aria-hidden="true" size={20} /></span
					>
					<h2 class="mt-4 text-lg font-black">{feature.title}</h2>
					<p class="mt-2 text-sm leading-6 text-slate-600">{feature.copy}</p>
				</article>
			{/each}
		</section>

		<section class="mt-12 rounded-2xl bg-slate-950 p-7 text-white sm:p-9">
			<h2 class="text-2xl font-black">What Prizen is not</h2>
			<p class="mt-3 max-w-3xl leading-7 text-slate-300">
				Prizen is not a marketplace, merchant, payment processor, or guarantee that a listed price
				will be honoured. Purchases and payments remain between you and the marketplace. Future
				assisted-buying features will use explicit limits and keep marketplace sessions in your
				browser.
			</p>
		</section>
	</main>

	<footer class="border-t border-slate-200 bg-white">
		<div
			class="page-shell flex flex-wrap items-center justify-between gap-3 py-6 text-sm text-slate-500"
		>
			<p>Prizen is local-first and self-hosted.</p>
			<a class="font-semibold hover:text-indigo-600" href={resolve('/privacy')}>Privacy policy</a>
		</div>
	</footer>
</div>
