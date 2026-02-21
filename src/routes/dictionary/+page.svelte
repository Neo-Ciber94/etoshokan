<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { tick } from 'svelte';
	import { dictionaryState } from './state.svelte';

	const results = $derived(dictionaryState.results);
	const error = $derived(dictionaryState.error);
	const loading = $derived(dictionaryState.loading);

	$effect(() => {
		// Search each time the query changes
		const query = dictionaryState.query;
		dictionaryState.search(query);
	});

	$effect(() => {
		const currentSearch = page.url.searchParams.get('search');

		if (currentSearch) {
			dictionaryState.search(currentSearch);
		}
	});

	$effect(() => {
		const query = dictionaryState.query;

		tick().then(() => {
			if (query.length === 0) {
				replaceState('', {});
			} else {
				replaceState(`?search=${query.trim()}`, {});
			}
		});
	});

	function clearResults() {
		dictionaryState.clear();
	}
</script>

<svelte:head>
	<title>Etoshokan - Dictionary</title>
</svelte:head>

<div class="space-y-8">
	<section class="space-y-4">
		<div class="space-y-2">
			<h2 class="text-xl font-semibold">Dictionary</h2>
		</div>

		<div class="flex gap-3">
			<div class="relative flex-1">
				<Input
					placeholder="Search English or Japanese"
					bind:value={dictionaryState.query}
					class="flex-1"
				/>
				{#if loading}
					<div
						class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
					>
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
				{:else if dictionaryState.query}
					<button
						onclick={clearResults}
						class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground sm:hidden"
						aria-label="Clear search"
					>
						<svg
							class="h-4 w-4"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				{/if}
			</div>
			<div class="hidden gap-2 sm:flex">
				<Button variant="outline" onclick={clearResults}>Clear</Button>
			</div>
		</div>

		{#if error}
			<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
				{error}
			</div>
		{/if}
	</section>

	<section class="space-y-4">
		{#if results.length > 0}
			<div class="grid gap-6">
				{#each results as entry, idx (idx)}
					<Card.Root class="border border-border py-2 md:py-6">
						<Card.Content class="flex flex-col gap-2 px-4 py-1 md:px-6">
							{#if entry.common}
								<Badge
									class="w-fit bg-emerald-800 px-1.5 py-0 text-[9px] text-white hover:bg-emerald-800"
									>common</Badge
								>
							{/if}
							<div class="grid gap-2 md:grid-cols-[auto_1fr] md:gap-6">
								<!-- Left side: Word and Reading -->
								<div
									class="border-r-none flex flex-row items-center gap-2 border-border pr-6 md:flex-col md:items-start md:gap-0 md:border-r"
								>
									{#if entry.reading}
										<div class="order-2 mb-0 text-base text-muted-foreground md:order-0 md:mb-2">
											{entry.reading}
										</div>
									{/if}
									<div class="text-2xl font-bold text-foreground md:text-5xl">
										{entry.term}
									</div>
								</div>

								<!-- Right side: Meanings -->
								<div class="space-y-2 md:space-y-4">
									{#each entry.senses as sense, senseIdx (senseIdx)}
										<div class="space-y-1 md:space-y-2">
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
														<div class="text-sm text-foreground md:text-base">
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
										</div>
									{/each}
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else if !loading}
			<div class="rounded-md border border-border bg-muted p-8 text-center">
				<p class="text-sm text-muted-foreground">No results yet. Try searching for a word.</p>
			</div>
		{/if}
	</section>
</div>
