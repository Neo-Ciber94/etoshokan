<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { tick } from 'svelte';
	import { dictionaryState } from './dictionaryState.svelte';
	import { searchOptions } from './searchOptions.svelte';
	import SaveWordActions from '$lib/components/SaveWordActions.svelte';
	import LanguageFlag from '$lib/components/LanguageFlag.svelte';
	import type { WordEntry } from '$lib/dictionary/core/dictionary';

	const MAX_SENSES_PER_WORD = 3;
	const MAX_GLOSSES_PER_WORD = 3;

	const results = $derived(dictionaryState.results);
	const error = $derived(dictionaryState.error);
	const loading = $derived(dictionaryState.loading);

	const languageGroups = $derived.by(() => {
		const byLanguage: Record<string, WordEntry[]> = {};

		for (const entry of results) {
			if (!byLanguage[entry.language]) {
				byLanguage[entry.language] = [];
			}
			byLanguage[entry.language].push(entry);
		}

		return ['en', 'es']
			.filter((lang) => byLanguage[lang]?.length > 0)
			.map((lang) => ({ language: lang, entries: byLanguage[lang] }));
	});

	function languageLabel(lang: string): string {
		if (lang === 'en') {
			return 'English';
		}
		if (lang === 'es') {
			return 'Spanish';
		}
		return lang;
	}

	function buildOptions() {
		return {
			maxResults: searchOptions.maxResults,
			lang: searchOptions.language === 'all' ? undefined : searchOptions.language
		};
	}

	$effect(() => {
		const query = dictionaryState.query;
		const opts = buildOptions();
		dictionaryState.search(query, opts);
	});

	$effect(() => {
		const currentSearch = page.url.searchParams.get('search');
		if (currentSearch) {
			dictionaryState.search(currentSearch, buildOptions());
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

<section class="space-y-4">
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
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
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

<section class="space-y-6">
	{#if results.length > 0}
		{#each languageGroups as { language, entries }}
			<div class="space-y-3">
				<div class="flex items-center gap-2">
					<LanguageFlag {language} class="size-8" />
					<span class="text-md font-medium text-muted-foreground">{languageLabel(language)}</span>
				</div>
				<div class="grid gap-6">
					{#each entries as entry, idx (idx)}
						<Card.Root class="border border-border py-2 md:py-4">
							<Card.Content class="flex flex-col gap-2 px-4 py-1 md:px-6">
								<div class="flex items-start justify-between gap-2">
									{#if entry.common}
										<Badge class="w-fit bg-yellow-500 px-1.5 py-0 text-[9px] text-black"
											>common</Badge
										>
									{:else}
										<div></div>
									{/if}
									<div class="flex items-center gap-1">
										<a
											href="/dictionary/{entry.id}"
											class="flex h-7 items-center rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
										>
											More
										</a>
										<DropdownMenu.Root>
											<DropdownMenu.Trigger>
												<button
													class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
													aria-label="Options"
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="16"
														height="16"
														viewBox="0 0 24 24"
														fill="currentColor"
													>
														<circle cx="12" cy="5" r="1.5" />
														<circle cx="12" cy="12" r="1.5" />
														<circle cx="12" cy="19" r="1.5" />
													</svg>
												</button>
											</DropdownMenu.Trigger>
											<DropdownMenu.Content align="end">
												<SaveWordActions {entry} />
											</DropdownMenu.Content>
										</DropdownMenu.Root>
									</div>
								</div>

								<div class="grid gap-2 md:grid-cols-[auto_1fr] md:gap-6">
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

									<div class="space-y-2 md:space-y-4">
										{#each entry.senses.slice(0, MAX_SENSES_PER_WORD) as sense, senseIdx (senseIdx)}
											<div class="space-y-1 md:space-y-2">
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

												{#if sense.glosses}
													<div class="space-y-1">
														{#each sense.glosses.slice(0, MAX_GLOSSES_PER_WORD) as gloss, glossIdx}
															<div class="text-sm text-foreground md:text-base">
																{#if sense.glosses.length > 1}
																	<span class="text-muted-foreground">{glossIdx + 1}.</span>
																{/if}
																{gloss.text}
															</div>
														{/each}
													</div>
												{/if}

												<!-- {#if sense.notes && sense.notes.length > 0}
													<div class="text-sm text-muted-foreground italic">
														{sense.notes.join('; ')}
													</div>
												{/if} -->

												<!-- {#if sense.examples && sense.examples.length > 0}
													<div class="flex flex-col gap-1 pt-2 pl-4">
														<span class="text-sm text-accent-foreground italic">Examples:</span>
														{#each sense.examples.slice(0, 2) as example (example)}
															{#each example.sentences as exampleSentence (exampleSentence.text)}
																<div class="text-sm text-muted-foreground italic">
																	{exampleSentence.text}
																</div>
															{/each}
														{/each}
													</div>
												{/if} -->
											</div>
										{/each}
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			</div>
		{/each}
	{:else if !loading}
		<div class="rounded-md border border-border bg-muted p-8 text-center">
			<p class="text-sm text-muted-foreground">No results yet. Try searching for a word.</p>
		</div>
	{/if}
</section>
