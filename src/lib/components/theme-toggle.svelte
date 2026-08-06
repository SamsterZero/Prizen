<script lang="ts">
	import { onMount } from 'svelte';
	import { Moon, Sun } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	let theme = $state<'light' | 'dark'>('light');

	onMount(() => {
		theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
	});

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = theme;
		localStorage.setItem('prizen-theme', theme);
	}
</script>

<Button
	variant="outline"
	size="icon-lg"
	class="theme-toggle"
	aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
	title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
	onclick={toggleTheme}
>
	{#if theme === 'dark'}
		<Sun aria-hidden="true" size={18} />
	{:else}
		<Moon aria-hidden="true" size={18} />
	{/if}
</Button>
