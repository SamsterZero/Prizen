<script lang="ts">
	import { resolve } from '$app/paths';
	import LogoMark from '$lib/components/logo-mark.svelte';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import { Button } from '$lib/components/ui/button';
</script>

<svelte:head>
	<title>Privacy Policy — Prizen</title>
	<meta
		name="description"
		content="How Prizen stores and processes data in a local installation."
	/>
</svelte:head>

<div class="app-surface min-h-screen bg-[#f8f9ff] text-slate-950">
	<header class="border-b border-slate-200 bg-white">
		<div class="page-shell flex items-center justify-between py-4">
			<a class="flex items-center gap-2 text-xl font-black tracking-tight" href={resolve('/')}>
				<LogoMark />
				Prizen
			</a>
			<div class="flex items-center gap-2">
				<ThemeToggle /><Button href={resolve('/dashboard')} variant="outline">Open dashboard</Button
				>
			</div>
		</div>
	</header>

	<main class="page-shell py-12 sm:py-16">
		<article
			class="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10"
		>
			<p class="text-sm font-bold tracking-[0.16em] text-indigo-600 uppercase">Privacy policy</p>
			<h1 class="mt-3 text-4xl font-black tracking-tight">Your installation, your data.</h1>
			<p class="mt-3 text-sm text-slate-500">Effective 6 August 2026</p>

			<div class="mt-8 space-y-8 text-sm leading-7 text-slate-600">
				<section>
					<h2 class="text-xl font-black text-slate-950">Local operation</h2>
					<p class="mt-2">
						Prizen is designed for personal, self-hosted use. Product records, price history,
						delivery settings, notification configuration, and operational logs are stored in the
						PostgreSQL database and container volumes controlled by you. Prizen does not require a
						Prizen cloud account.
					</p>
				</section>
				<section>
					<h2 class="text-xl font-black text-slate-950">Information processed</h2>
					<p class="mt-2">
						The application processes product URLs, titles, prices, availability observations,
						target prices, polling preferences, delivery pincodes, and notification-channel labels.
						Your browser may cache dashboard data and stores your selected colour theme locally.
					</p>
				</section>
				<section>
					<h2 class="text-xl font-black text-slate-950">External requests</h2>
					<p class="mt-2">
						To perform its functions, Prizen requests product pages or, when explicitly configured,
						approved product and offer data through supported marketplace APIs. It may also send
						test messages and alerts through Discord or Telegram. Those services receive the
						information necessary to fulfil each request and apply their own privacy terms. Delivery
						pincodes are not sent by Amazon or Flipkart tracking.
					</p>
				</section>
				<section>
					<h2 class="text-xl font-black text-slate-950">Credentials and payments</h2>
					<p class="mt-2">
						Marketplace API credentials, Discord webhook URLs, and Telegram bot credentials are
						encrypted before being stored. Keep your encryption key private and backed up. Prizen
						does not currently collect card details or marketplace passwords. Future Buy Assist
						connections are intended to keep marketplace cookies, passwords, addresses, and payment
						instruments inside the user's browser and marketplace account.
					</p>
				</section>
				<section>
					<h2 class="text-xl font-black text-slate-950">Optional services</h2>
					<p class="mt-2">
						Error reporting through Sentry is disabled unless the installation owner both configures
						an endpoint and explicitly enables telemetry. Email delivery through an SMTP provider is
						also inactive unless configured. If enabled, those providers may receive diagnostic or
						message-delivery data according to their configurations and policies. Prizen configures
						Sentry not to send default personally identifying information.
					</p>
				</section>
				<section>
					<h2 class="text-xl font-black text-slate-950">Retention and deletion</h2>
					<p class="mt-2">
						Data remains in your local database until you remove a tracked product, delete an
						integration, or delete the container volume. Removing a product also removes its
						associated price history. Backups created by you remain under your control.
					</p>
				</section>
				<section>
					<h2 class="text-xl font-black text-slate-950">Security and access</h2>
					<p class="mt-2">
						The provided container configuration binds Prizen and PostgreSQL to localhost. There is
						no application login in local mode. If you expose the service to a network or the
						internet, you are responsible for adding suitable access control, TLS, firewall rules,
						updates, and backups.
					</p>
				</section>
				<section>
					<h2 class="text-xl font-black text-slate-950">Policy changes</h2>
					<p class="mt-2">
						This policy should be updated whenever Prizen adds a marketplace, external service,
						cloud synchronization, or new category of stored data. The effective date above
						indicates the version included with this installation.
					</p>
				</section>
			</div>
		</article>
	</main>

	<footer class="border-t border-slate-200 bg-white">
		<div
			class="page-shell flex flex-wrap items-center justify-between gap-3 py-6 text-sm text-slate-500"
		>
			<a class="font-semibold hover:text-indigo-600" href={resolve('/about')}>About Prizen</a><a
				class="font-semibold hover:text-indigo-600"
				href={resolve('/')}>Back home</a
			>
		</div>
	</footer>
</div>
