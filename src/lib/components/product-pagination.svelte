<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';

	let {
		page,
		pageCount,
		onPageChange
	}: { page: number; pageCount: number; onPageChange: (page: number) => void } = $props();
</script>

{#if pageCount > 1}
	<nav class="mt-6 flex items-center justify-center gap-3" aria-label="Product pagination">
		<Button
			variant="outline"
			size="icon"
			disabled={page === 1}
			onclick={() => onPageChange(page - 1)}
			aria-label="Previous page"><ChevronLeft aria-hidden="true" size={18} /></Button
		>
		<p class="text-sm font-semibold text-slate-600">Page {page} of {pageCount}</p>
		<Button
			variant="outline"
			size="icon"
			disabled={page === pageCount}
			onclick={() => onPageChange(page + 1)}
			aria-label="Next page"><ChevronRight aria-hidden="true" size={18} /></Button
		>
	</nav>
{/if}
