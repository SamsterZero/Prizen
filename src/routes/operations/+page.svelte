<script lang="ts">
	import { resolve } from '$app/paths';
	import LogoMark from '$lib/components/logo-mark.svelte';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import { formatAge, type HealthLevel } from '$lib/modules/operations/health';
	import {
		Activity,
		ArrowLeft,
		BellRing,
		CircleAlert,
		CircleCheck,
		Clock3,
		Database,
		HardDrive,
		ListChecks,
		ShieldCheck
	} from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const now = $derived(new Date(data.generatedAt));

	function levelLabel(level: HealthLevel) {
		return {
			healthy: 'Healthy',
			warning: 'Needs attention',
			critical: 'Action required',
			unknown: 'Unknown'
		}[level];
	}

	function levelClass(level: HealthLevel) {
		return {
			healthy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
			warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
			critical: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
			unknown: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
		}[level];
	}

	function bytes(value: number) {
		if (!Number.isFinite(value) || value <= 0) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB', 'TB'];
		const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
		return `${(value / 1024 ** unit).toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
	}
</script>

<svelte:head>
	<title>Operations — Prizen</title>
	<meta name="description" content="Local operational health for this Prizen installation." />
</svelte:head>

<div class="app-surface min-h-screen bg-[#f8f9ff] text-slate-950">
	<header class="dashboard-nav border-b border-slate-200 bg-white">
		<div class="page-shell flex items-center justify-between py-4">
			<a class="flex items-center gap-2 text-xl font-black tracking-tight" href={resolve('/')}>
				<LogoMark />Prizen
			</a>
			<div class="flex items-center gap-3">
				<ThemeToggle />
				<Button href={resolve('/dashboard')} variant="outline" class="border-slate-200 bg-white">
					<ArrowLeft aria-hidden="true" size={16} />Dashboard
				</Button>
			</div>
		</div>
	</header>

	<main class="page-shell py-7">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class="text-sm font-bold tracking-[0.16em] text-indigo-600 uppercase">
					Local operations
				</p>
				<h1 class="mt-2 text-4xl font-black tracking-tight">Installation health</h1>
				<p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
					Actionable diagnostics from your local database. No telemetry or diagnostic data leaves
					this installation.
				</p>
			</div>
			<span
				class="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700"
			>
				<ShieldCheck aria-hidden="true" size={14} />Local only
			</span>
		</div>

		<section class="mt-6 grid gap-4 lg:grid-cols-2" aria-label="Operations summary">
			<article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
				<div class="flex items-start justify-between gap-4">
					<div class="flex items-center gap-3">
						<span class="rounded-xl bg-indigo-100 p-2.5 text-indigo-700"
							><Activity aria-hidden="true" size={20} /></span
						>
						<div>
							<p class="text-xs font-bold tracking-wide text-slate-500 uppercase">Tracker</p>
							<h2 class="mt-1 text-xl font-black">Worker heartbeat</h2>
						</div>
					</div>
					<span class="rounded-full px-2.5 py-1 text-xs font-bold {levelClass(data.tracker.level)}"
						>{levelLabel(data.tracker.level)}</span
					>
				</div>
				<div class="mt-6 grid grid-cols-2 gap-3">
					<div class="rounded-xl bg-slate-50 p-4">
						<p class="text-xs font-bold text-slate-500">Last success</p>
						<p class="mt-2 text-lg font-black">{formatAge(data.tracker.lastSuccessAt, now)}</p>
					</div>
					<div class="rounded-xl bg-slate-50 p-4">
						<p class="text-xs font-bold text-slate-500">Last error</p>
						<p class="mt-2 text-lg font-black">{formatAge(data.tracker.lastErrorAt, now)}</p>
					</div>
				</div>
			</article>

			<article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
				<div class="flex items-center gap-3">
					<span class="rounded-xl bg-blue-100 p-2.5 text-blue-700"
						><ListChecks aria-hidden="true" size={20} /></span
					>
					<div>
						<p class="text-xs font-bold tracking-wide text-slate-500 uppercase">Scan queue</p>
						<h2 class="mt-1 text-xl font-black">Product checks</h2>
					</div>
				</div>
				<div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
					{#each [['Pending', data.scans.pending], ['Running', data.scans.running], ['Failed', data.scans.failed], ['Overdue', data.scans.overdue]] as metric (metric[0])}
						<div class="rounded-xl bg-slate-50 p-3">
							<p class="text-xs font-bold text-slate-500">{metric[0]}</p>
							<p class="mt-1 text-2xl font-black">{metric[1]}</p>
						</div>
					{/each}
				</div>
				<div class="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-500">
					<span>Last successful scan: {formatAge(data.scans.last_success_at, now)}</span><span
						>Oldest overdue: {formatAge(data.scans.oldest_overdue_at, now)}</span
					>
				</div>
			</article>

			<article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
				<div class="flex items-center gap-3">
					<span class="rounded-xl bg-violet-100 p-2.5 text-violet-700"
						><BellRing aria-hidden="true" size={20} /></span
					>
					<div>
						<p class="text-xs font-bold tracking-wide text-slate-500 uppercase">Notifications</p>
						<h2 class="mt-1 text-xl font-black">Delivery health</h2>
					</div>
				</div>
				<div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
					{#each [['Verified', data.notifications.verified_channels], ['Pending', data.notifications.pending], ['Sent · 24h', data.notifications.delivered_24h], ['Failed · 24h', data.notifications.failed_24h]] as metric (metric[0])}
						<div class="rounded-xl bg-slate-50 p-3">
							<p class="text-xs font-bold text-slate-500">{metric[0]}</p>
							<p class="mt-1 text-2xl font-black">{metric[1]}</p>
						</div>
					{/each}
				</div>
				<div class="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-500">
					<span>Last delivered: {formatAge(data.notifications.last_delivered_at, now)}</span><span
						>Last failed: {formatAge(data.notifications.last_failed_at, now)}</span
					>
				</div>
			</article>

			<article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
				<div class="flex items-start justify-between gap-4">
					<div class="flex items-center gap-3">
						<span class="rounded-xl bg-amber-100 p-2.5 text-amber-700"
							><HardDrive aria-hidden="true" size={20} /></span
						>
						<div>
							<p class="text-xs font-bold tracking-wide text-slate-500 uppercase">
								Data protection
							</p>
							<h2 class="mt-1 text-xl font-black">Storage & backup</h2>
						</div>
					</div>
					<span class="rounded-full px-2.5 py-1 text-xs font-bold {levelClass(data.backup.level)}"
						>{levelLabel(data.backup.level)}</span
					>
				</div>
				<div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
					<div class="rounded-xl bg-slate-50 p-3">
						<Database aria-hidden="true" size={15} class="text-slate-400" />
						<p class="mt-2 text-xs font-bold text-slate-500">Database</p>
						<p class="mt-1 text-xl font-black">{bytes(data.storage.database_bytes)}</p>
					</div>
					<div class="rounded-xl bg-slate-50 p-3">
						<p class="text-xs font-bold text-slate-500">Observations</p>
						<p class="mt-1 text-xl font-black">{data.storage.observation_count}</p>
					</div>
					<div class="rounded-xl bg-slate-50 p-3">
						<p class="text-xs font-bold text-slate-500">Added · 24h</p>
						<p class="mt-1 text-xl font-black">{data.storage.observations_24h}</p>
					</div>
					<div class="rounded-xl bg-slate-50 p-3">
						<Clock3 aria-hidden="true" size={15} class="text-slate-400" />
						<p class="mt-2 text-xs font-bold text-slate-500">Last backup</p>
						<p class="mt-1 text-xl font-black">{formatAge(data.backup.lastBackupAt, now)}</p>
					</div>
				</div>
				<p class="mt-4 text-xs font-semibold text-slate-500">
					History spans {formatAge(data.storage.oldest_observation_at, now)} to {formatAge(
						data.storage.newest_observation_at,
						now
					)}. Backups are recorded only when the provided backup script finishes successfully.
				</p>
			</article>
		</section>

		{#if data.scans.failed > 0 || data.notifications.failed > 0}
			<div
				class="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
			>
				<CircleAlert aria-hidden="true" size={20} class="mt-0.5 shrink-0" />
				<div>
					<h2 class="font-black">Failures need attention</h2>
					<p class="mt-1 text-sm">
						Review service logs locally for details. Raw errors are intentionally excluded here
						because they may contain sensitive marketplace or delivery context.
					</p>
				</div>
			</div>
		{:else}
			<div
				class="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"
			>
				<CircleCheck aria-hidden="true" size={20} />
				<p class="text-sm font-bold">
					No queued scan or notification failures are currently recorded.
				</p>
			</div>
		{/if}
	</main>
</div>
