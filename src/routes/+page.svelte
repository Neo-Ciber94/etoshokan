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
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

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

	// Debounced search effect
	$effect(() => {
		// Clear existing timer
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		// Clear results if query is empty
		if (!query || !query.trim()) {
			results = [];
			error = '';
			return;
		}

		// Set new timer for debounced search
		debounceTimer = setTimeout(() => {
			search();
		}, 300);

		// Cleanup function
		return () => {
			if (debounceTimer) {
				clearTimeout(debounceTimer);
			}
		};
	});

	async function search() {
		error = '';
		if (!query || !query.trim()) {
			results = [];
			return;
		}
		try {
			loading = true;
			const res = await dict.lookup(query.trim(), { targetLanguage: 'en' });
			console.log(res);
			results = res.entries;
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

<svelte:head>
	<title>Etoshokan - Dictionary</title>
</svelte:head>

<div class="space-y-8">
	<section class="space-y-4">
		<div class="space-y-2">
			<h2 class="text-xl font-semibold">Dictionary Search</h2>
			<p class="text-sm text-muted-foreground">
				Search for Japanese words, kanji, or romaji
			</p>
		</div>

		<div class="flex flex-col gap-3 sm:flex-row">
			<div class="relative flex-1">
				<Input
					placeholder="Start typing to search... (e.g., sushi, すし, or 寿司)"
					bind:value={query}
					class="flex-1"
				/>
				{#if loading}
					<div class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
						<svg
							class="h-4 w-4 animate-spin"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
					</div>
				{/if}
			</div>
			<div class="flex gap-2">
				<Button variant="outline" onclick={clearResults}>Clear</Button>
				<Button variant="destructive" onclick={clearCache}>Reset Cache</Button>
			</div>
		</div>

		{#if error}
			<div
				class="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
			>
				{error}
			</div>
		{/if}
	</section>

	<section class="space-y-4">
		{#if results && results.length > 0}
			<div class="grid gap-6">
				{#each results as entry, idx (idx)}
					<Card.Root class="border border-border">
						<Card.Content class="p-6">
							<div class="grid gap-6 md:grid-cols-[auto_1fr]">
								<!-- Left side: Word and Reading -->
								<div class="flex flex-col items-start border-r border-border pr-6">
									{#if entry.reading}
										<div class="mb-2 text-sm text-muted-foreground">
											{entry.reading}
										</div>
									{/if}
									<div class="text-5xl font-bold text-foreground">
										{entry.term}
									</div>
									<div class="mt-2 text-xs text-muted-foreground">
										{entry.language}
									</div>
								</div>

								<!-- Right side: Meanings -->
								<div class="space-y-4">
									{#each entry.senses as sense, senseIdx (senseIdx)}
										<div class="space-y-2">
											<!-- Sense number and part of speech -->
											<div class="flex items-center gap-2">
												<span class="text-lg font-semibold text-foreground">
													{senseIdx + 1}.
												</span>
												{#if sense.partOfSpeech}
													<span
														class="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
													>
														{sense.partOfSpeech}
													</span>
												{/if}
											</div>

											<!-- Glosses -->
											{#if sense.glosses}
												<div class="space-y-1">
													{#each sense.glosses as gloss, glossIdx}
														<div class="text-base text-foreground">
															{#if sense.glosses.length > 1}
																<span class="text-muted-foreground">{glossIdx + 1}.</span>
															{/if}
															{gloss.text}
														</div>
													{/each}
												</div>
											{/if}

											<!-- Notes -->
											{#if sense.notes && sense.notes.length > 0}
												<div class="text-sm text-muted-foreground italic">
													{sense.notes.join('; ')}
												</div>
											{/if}

											<!-- Examples -->
											{#if sense.examples && sense.examples.length > 0}
												<div
													class="mt-2 space-y-1 border-l-2 border-border pl-3"
												>
													{#each sense.examples as ex}
														<div class="text-sm">
															<div class="text-foreground">
																{ex.text}
															</div>
															{#if ex.translation}
																<div class="text-muted-foreground">
																	{ex.translation}
																</div>
															{/if}
														</div>
													{/each}
												</div>
											{/if}
										</div>
									{/each}

									<!-- Metadata toggle (discrete) -->
									{#if entry.senses.some((s) => s.meta)}
										<details class="group mt-4">
											<summary
												class="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground"
											>
												<span class="select-none">metadata</span>
											</summary>
											<div class="mt-2 space-y-2">
												{#each entry.senses as sense, senseIdx}
													{#if sense.meta}
														<div class="text-xs">
															<div class="font-medium text-muted-foreground">
																Sense {senseIdx + 1} metadata:
															</div>
															<pre
																class="mt-1 overflow-auto rounded bg-muted p-2 text-xs text-muted-foreground">{JSON.stringify(
																	sense.meta,
																	null,
																	2
																)}</pre>
														</div>
													{/if}
												{/each}
											</div>
										</details>
									{/if}
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else if !loading}
			<div
				class="rounded-md border border-border bg-muted p-8 text-center"
			>
				<p class="text-sm text-muted-foreground">
					No results yet. Try searching for a word.
				</p>
			</div>
		{/if}
	</section>
</div>
