<script lang="ts">
	import { resolve } from '$app/paths';
	import { Activity, Settings } from '@lucide/svelte';
	import LogoMark from '$lib/components/logo-mark.svelte';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import { Button } from '$lib/components/ui/button';
</script>

<header class="dashboard-nav border-b border-slate-200 bg-white">
	<div class="page-shell flex items-center justify-between py-4">
		<a class="flex items-center gap-2 text-xl font-black tracking-tight" href={resolve('/')}>
			<LogoMark />Prizen
		</a>
		<div class="flex items-center gap-3">
			<ThemeToggle />
			<Button
				href={resolve('/operations')}
				variant="outline"
				size="icon-lg"
				class="border-slate-200 bg-white text-slate-700 hover:border-slate-300"
				aria-label="Operations"
				title="Operations"
			>
				<Activity aria-hidden="true" size={18} />
			</Button>
			<Button
				href={resolve('/settings')}
				variant="outline"
				size="icon-lg"
				class="border-slate-200 bg-white text-slate-700 hover:border-slate-300"
				aria-label="Settings"
				title="Settings"
			>
				<Settings aria-hidden="true" size={18} />
			</Button>
		</div>
	</div>
</header>
