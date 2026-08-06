<script lang="ts">
	import { resolve } from '$app/paths';
	import LogoMark from '$lib/components/logo-mark.svelte';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import { Button } from '$lib/components/ui/button';
</script>

<svelte:head>
	<title>Prizen — Buy at the right price</title>
	<meta
		name="description"
		content="Prizen helps you make better purchase decisions with price tracking and alerts."
	/>
</svelte:head>

<div class="app-surface min-h-screen bg-[#f8f9ff] text-slate-950">
	<header class="page-shell flex items-center justify-between py-6">
		<a class="flex items-center gap-2 text-xl font-black tracking-tight" href={resolve('/')}>
			<LogoMark />
			Prizen
		</a>
		<div class="flex items-center gap-3">
			<ThemeToggle />
			<Button
				href={resolve('/dashboard')}
				class="h-10 bg-indigo-600 px-4 text-white hover:bg-indigo-700">Open dashboard</Button
			>
		</div>
	</header>

	<main class="page-shell pt-12 pb-20 lg:pt-24">
		<section
			class="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr] 2xl:grid-cols-[1.3fr_0.7fr]"
		>
			<div>
				<p class="mb-4 text-sm font-bold tracking-[0.18em] text-indigo-600 uppercase">
					Price intelligence
				</p>
				<h1 class="max-w-[16ch] text-5xl leading-[1.03] font-black tracking-[-0.045em] sm:text-7xl">
					Buy when the price is right.
				</h1>
				<p class="mt-6 max-w-xl text-lg leading-8 text-slate-600">
					Keep your wish list in one calm, clear place. Set a target price, understand the trend,
					and make your next purchase with confidence.
				</p>
				<div class="mt-8 flex flex-wrap gap-3">
					<Button
						href={resolve('/dashboard')}
						class="h-11 bg-indigo-600 px-5 text-white hover:bg-indigo-700">Start tracking</Button
					>
					<Button
						href="#how-it-works"
						variant="outline"
						class="h-11 border-slate-200 bg-white px-5 text-slate-700 hover:border-slate-300"
						>How it works</Button
					>
				</div>
			</div>
			<div class="rounded-3xl bg-slate-950 p-7 text-white shadow-2xl shadow-indigo-950/15">
				<span class="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300"
					>A smarter wish list</span
				>
				<div class="mt-12 rounded-2xl bg-white/10 p-5">
					<p class="text-sm text-slate-400">Target price reached</p>
					<p class="mt-2 text-3xl font-black">Sony WH-1000XM5</p>
					<div class="mt-5 flex items-end justify-between">
						<span class="text-3xl font-black">₹22,490</span><span
							class="rounded-lg bg-emerald-400/15 px-2.5 py-1 text-sm font-bold text-emerald-300"
							>₹2,500 saved</span
						>
					</div>
				</div>
				<p class="mt-6 text-sm leading-6 text-slate-400">
					A focused dashboard keeps your tracking details separate from the introduction.
				</p>
			</div>
		</section>
		<section id="how-it-works" class="mt-28 grid gap-5 md:grid-cols-3">
			<article class="rounded-2xl border border-slate-200 bg-white p-6">
				<span class="text-sm font-black text-indigo-600">01</span>
				<h2 class="mt-4 text-xl font-black">Add a product</h2>
				<p class="mt-2 text-sm leading-6 text-slate-600">
					Save the product link, its current price, and the price you want to pay.
				</p>
			</article>
			<article class="rounded-2xl border border-slate-200 bg-white p-6">
				<span class="text-sm font-black text-indigo-600">02</span>
				<h2 class="mt-4 text-xl font-black">See the signal</h2>
				<p class="mt-2 text-sm leading-6 text-slate-600">
					Keep your price and target visible without a noisy marketplace feed.
				</p>
			</article>
			<article class="rounded-2xl border border-slate-200 bg-white p-6">
				<span class="text-sm font-black text-indigo-600">03</span>
				<h2 class="mt-4 text-xl font-black">Decide with confidence</h2>
				<p class="mt-2 text-sm leading-6 text-slate-600">
					Use the history and alerts in the dashboard to choose your moment.
				</p>
			</article>
		</section>
	</main>
	<footer class="border-t border-slate-200 bg-white">
		<div
			class="page-shell flex flex-wrap items-center justify-between gap-4 py-6 text-sm text-slate-500"
		>
			<p>Prizen is a local-first, self-hosted price tracker.</p>
			<nav class="flex items-center gap-5" aria-label="Information">
				<a class="font-semibold hover:text-indigo-600" href={resolve('/about')}>About</a>
				<a class="font-semibold hover:text-indigo-600" href={resolve('/privacy')}>Privacy</a>
			</nav>
		</div>
	</footer>
</div>
