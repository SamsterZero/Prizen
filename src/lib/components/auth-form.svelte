<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';

	let { mode }: { mode: 'login' | 'register' } = $props();
	let email = $state('');
	let password = $state('');
	let message = $state('');
	let submitting = $state(false);
	const isLogin = $derived(mode === 'login');

	async function submit() {
		if (submitting) return;
		submitting = true;
		message = '';
		try {
			const response = await fetch(`/api/auth/${mode}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email, password })
			});
			const data = (await response.json()) as { message?: string };
			if (!response.ok) throw new Error(data.message ?? 'Authentication failed.');
			const requested = page.url.searchParams.get('next');
			const destination =
				requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard';
			await goto(resolve(destination as '/dashboard'));
		} catch (exception) {
			message = exception instanceof Error ? exception.message : 'Authentication failed.';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="app-surface grid min-h-screen place-items-center bg-[#f8f9ff] p-5 text-slate-950">
	<div class="w-full max-w-md">
		<a
			class="mx-auto flex w-fit items-center gap-2 text-xl font-black tracking-tight"
			href={resolve('/')}
		>
			<span class="grid size-9 place-items-center rounded-xl bg-indigo-600 text-lg text-white"
				>P</span
			>
			Prizen
		</a>
		<form
			class="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-indigo-950/5"
			onsubmit={(event) => {
				event.preventDefault();
				submit();
			}}
		>
			<h1 class="text-2xl font-black">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
			<p class="mt-2 text-sm text-slate-500">
				{isLogin
					? 'Sign in to your private tracking dashboard.'
					: 'Keep your trackers and alerts private.'}
			</p>
			<label class="mt-6 block text-sm font-semibold">
				Email
				<input
					class="mt-2 w-full rounded-xl border-slate-300"
					type="email"
					bind:value={email}
					autocomplete="email"
					required
				/>
			</label>
			<label class="mt-4 block text-sm font-semibold">
				Password
				<input
					class="mt-2 w-full rounded-xl border-slate-300"
					type="password"
					bind:value={password}
					autocomplete={isLogin ? 'current-password' : 'new-password'}
					minlength={isLogin ? undefined : 12}
					maxlength="128"
					required
				/>
			</label>
			{#if !isLogin}<p class="mt-2 text-xs text-slate-500">Use at least 12 characters.</p>{/if}
			{#if message}<p class="mt-4 text-sm font-semibold text-rose-700">{message}</p>{/if}
			<Button
				class="mt-6 h-10 w-full bg-indigo-600 text-white hover:bg-indigo-700"
				disabled={submitting}
			>
				{submitting ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
			</Button>
			<p class="mt-5 text-center text-sm text-slate-500">
				{isLogin ? 'New to Prizen?' : 'Already have an account?'}
				<a
					class="font-bold text-indigo-600 hover:text-indigo-700"
					href={resolve(isLogin ? '/register' : '/login')}
					>{isLogin ? 'Create an account' : 'Sign in'}</a
				>
			</p>
		</form>
	</div>
</div>
