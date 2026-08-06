<script lang="ts">
	import './layout.css';
	import { base } from '$app/paths';
	import { Toaster } from 'svelte-sonner';

	let { children } = $props();
	const logoHref = `${base}/prizen.svg`;
</script>

<svelte:head>
	<link rel="icon" href={logoHref} type="image/svg+xml" />
	<link rel="mask-icon" href={logoHref} color="#4f46e5" />
</svelte:head>
{@render children()}
<Toaster richColors position="top-right" />
