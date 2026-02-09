<script lang="ts">
	import { onMount } from 'svelte';
	import { dictionary } from '$lib/dictionary';

	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import type { WordEntry } from '$lib/dictionary/core/dictionary';

	const dict = dictionary;

	let loading = $state(false);
	let query = $state('');
	let results = $state<WordEntry[]>([]);
	let error = $state('');

	$effect(() => {
		async function run() {
			try {
				loading = true;
				await dict.initialize();
			} catch (err) {
				console.error(err);
				error = (err && (err as any).message) || String(err);
			} finally {
				loading = false;
			}
		}

        run();
	});

	async function search() {
		error = '';
		results = [];
		if (!query || !query.trim()) return;
		try {
			loading = true;
			const res = await dict.lookup(query.trim(), { targetLanguage: 'en' });
			console.log(res);
			results = res;
		} catch (err) {
			console.error(err);
			error = (err && (err as any).message) || String(err);
		} finally {
			loading = false;
		}
	}

	function clearResults() {
		query = '';
		results = [];
		error = '';
	}

	async function clearCache() {
		try {
			await dict.clear();
			await dict.initialize();
		} catch (err) {
			console.error(err);
			error = (err && (err as any).message) || String(err);
		}
	}
</script>

<div class="space-y-8">
	<section class="space-y-4">
		<div class="space-y-2">
			<h2 class="text-xl font-semibold">Dictionary Search</h2>
			<p class="text-sm text-slate-600 dark:text-slate-400">
				Search for Japanese words, kanji, or romaji
			</p>
		</div>

		<div class="flex flex-col gap-3 sm:flex-row">
			<Input
				placeholder="e.g., sushi, すし, or 寿司"
				bind:value={query}
				onkeydown={(e) => e.key === 'Enter' && search()}
				disabled={loading}
				class="flex-1"
			/>
			<div class="flex gap-2">
				<Button onclick={search} disabled={loading}>
					{loading ? 'Searching...' : 'Search'}
				</Button>
				<Button variant="outline" onclick={clearResults}>Clear</Button>
				<Button variant="destructive" onclick={clearCache}>Reset Cache</Button>
			</div>
		</div>

		{#if error}
			<div
				class="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200"
			>
				{error}
			</div>
		{/if}
	</section>

	<section class="space-y-4">
		{#if results && results.length > 0}
			<div class="grid gap-4">
				{#each results as entry, idx (idx)}
					<Card.Root class="border border-slate-200 dark:border-slate-800">
						<Card.Header class="pb-3">
							<div class="flex items-baseline justify-between">
								<div>
									<Card.Title class="text-lg">{entry.term}</Card.Title>
									{#if entry.reading}
										<p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
											Reading: {entry.reading}
										</p>
									{/if}
								</div>
								<span class="text-xs text-slate-500">Lang: {entry.language}</span>
							</div>
						</Card.Header>

						<Card.Content class="space-y-4 pt-4">
							{#each entry.senses as sense, senseIdx (senseIdx)}
								<div
									class="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40"
								>
									<div class="flex items-baseline justify-between">
										<span class="font-medium text-slate-900 dark:text-slate-100">
											{sense.partOfSpeech ?? '—'}
										</span>
										<span class="text-xs text-slate-500">Sense {senseIdx + 1}</span>
									</div>

									{#if sense.glosses}
										<div class="text-sm text-slate-700 dark:text-slate-300">
											<!-- <span class="font-medium">Glosses:</span> -->
											<ul class="space-y-1 pl-4">
												{#each sense.glosses as gloss}
													<li class="ml-4 list-disc text-sm text-slate-700 dark:text-slate-300">
														<span>{gloss.text}</span>
													</li>
												{/each}
											</ul>
										</div>
									{/if}

									{#if sense.notes}
										<p class="text-sm text-slate-700 dark:text-slate-300">
											<span class="font-medium">Notes:</span>
											{sense.notes.join('; ')}
										</p>
									{/if}

									{#if sense.examples && sense.examples.length > 0}
										<div class="space-y-1">
											<p class="text-xs font-medium text-slate-600 dark:text-slate-400">
												Examples:
											</p>
											<ul class="space-y-1 pl-4">
												{#each sense.examples as ex}
													<li class="text-sm text-slate-700 dark:text-slate-300">
														• {ex.text}
														{#if ex.translation}
															<span class="text-slate-600 dark:text-slate-400"
																>— {ex.translation}</span
															>
														{/if}
													</li>
												{/each}
											</ul>
										</div>
									{/if}

									{#if sense.meta}
										<details class="cursor-pointer text-sm">
											<summary class="font-medium text-slate-700 dark:text-slate-300">
												Metadata
											</summary>
											<pre
												class="mt-2 overflow-auto rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">
{JSON.stringify(sense.meta, null, 2)}
											</pre>
										</details>
									{/if}
								</div>
							{/each}
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else if !loading}
			<div
				class="rounded-md border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/40"
			>
				<p class="text-sm text-slate-600 dark:text-slate-400">
					No results yet. Try searching for a word.
				</p>
			</div>
		{/if}
	</section>
</div>
