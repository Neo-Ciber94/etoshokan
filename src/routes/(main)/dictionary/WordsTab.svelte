<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Badge } from '$lib/components/ui/badge';
	import { useSavedWords } from '$lib/data/words/words-storage.svelte';
	import SaveWordActions from '$lib/components/SaveWordActions.svelte';
	import { editCategoryDialog } from '$lib/components/edit-category-dialog.svelte';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Button from '$lib/components/ui/button/button.svelte';
	import LanguageFlag from '$lib/components/LanguageFlag.svelte';

	const MAX_SENSES_PER_WORD = 3;
	const MAX_GLOSSES_PER_WORD = 3;

	let filter = $state<string>('all');

	const savedWords = useSavedWords();

	const totalWords = $derived(savedWords.categories.reduce((sum, c) => sum + c.words.length, 0));

	const displayCategories = $derived(
		filter === 'all'
			? savedWords.categories.filter((c) => c.words.length > 0)
			: savedWords.categories.filter((c) => c.category === filter && c.words.length > 0)
	);
</script>

<section class="space-y-4">
	<div class="flex flex-wrap gap-2">
		<button
			onclick={() => (filter = 'all')}
			class="rounded-full border px-3 py-1 text-sm transition-colors {filter === 'all'
				? 'border-foreground bg-foreground text-background'
				: 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}"
		>
			All
		</button>
		{#each savedWords.categoryNames as cat (cat)}
			<button
				onclick={() => (filter = cat)}
				class="rounded-full border px-3 py-1 text-sm transition-colors {filter === cat
					? 'border-foreground bg-foreground text-background'
					: 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}"
			>
				{cat}
			</button>
		{/each}
	</div>

	{#if totalWords > 0}
		{#each displayCategories as { category, words }}
			<div class="space-y-3">
				<div class="flex items-center justify-between gap-1">
					<h3 class="text-sm font-medium text-muted-foreground">{category}</h3>
					<Button
						onclick={() => editCategoryDialog.show(category)}
						variant="outline"
						size="icon"
						class="rounded-full"
						aria-label="Edit category"
					>
						<Pencil size={16} />
					</Button>
				</div>
				<div class="grid gap-6">
					{#each words as entry (entry.term + entry.language)}
						<Card.Root class="border border-border py-2 md:py-6">
							<Card.Content class="flex flex-col gap-2 px-4 py-1 md:px-6">
								<div class="flex items-start justify-between gap-2">
									<div class="flex items-center gap-1.5">
										{#if entry.common}
											<Badge
												class="w-fit bg-emerald-800 px-1.5 py-0 text-[9px] text-white hover:bg-emerald-800"
												>common</Badge
											>
										{/if}
										<LanguageFlag language={entry.language} class="size-6" />
									</div>
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
			</div>
		{/each}
	{:else}
		<div class="rounded-md border border-border bg-muted p-8 text-center">
			<p class="text-sm text-muted-foreground">
				No saved words yet. Save words from the search tab.
			</p>
		</div>
	{/if}
</section>
