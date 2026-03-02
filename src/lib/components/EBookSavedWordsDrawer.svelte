<script lang="ts">
	import * as Drawer from '$lib/components/ui/drawer'
	import * as Card from '$lib/components/ui/card'
	import { Badge } from '$lib/components/ui/badge'
	import LanguageFlag from '$lib/components/LanguageFlag.svelte'
	import { useSavedWords } from '$lib/data/words/words-storage.svelte'
	import type { WordEntry } from '$lib/dictionary/core/dictionary'
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'

	interface Props {
		open: boolean
		category: string | undefined
	}

	let { open = $bindable(), category }: Props = $props()

	const savedWords = useSavedWords()

	const categoryWords = $derived.by(() => {
		if (!category) {
			return []
		}
		const cat = savedWords.categories.find((c) => c.category === category)
		return cat?.words ?? []
	})

	let selectedWord = $state<WordEntry | null>(null)
	let wordDrawerOpen = $state(false)
	let showWordDrawer = $state(false)

	function openWordDetails(word: WordEntry) {
		selectedWord = word
		showWordDrawer = true
		wordDrawerOpen = true
	}

	$effect(() => {
		if (!wordDrawerOpen && showWordDrawer) {
			const timer = setTimeout(() => {
				showWordDrawer = false
				selectedWord = null
			}, 300)
			return () => clearTimeout(timer)
		}
	})
</script>

<Drawer.Root bind:open direction="bottom">
	<Drawer.Content class="max-h-[90vh]! md:max-h-[60vh]!">
		<Drawer.Header>
			<Drawer.Title>Saved Words</Drawer.Title>
			{#if category}
				<Drawer.Description>{category}</Drawer.Description>
			{/if}
		</Drawer.Header>

		<div class="flex-1 overflow-y-auto px-4 pb-6">
			{#if categoryWords.length === 0}
				<p class="py-8 text-center text-sm text-muted-foreground">
					No words saved for this book yet.
				</p>
			{:else}
				<div class="flex flex-col gap-2">
					{#each categoryWords as word (word.id)}
						{@const firstSense = word.senses[0]}
						<button
							class="flex items-center justify-between rounded-md border border-border px-3 py-2 text-left transition-colors hover:bg-muted"
							onclick={() => openWordDetails(word)}
						>
							<div class="flex min-w-0 flex-col gap-0.5">
								<div class="flex items-baseline gap-2">
									<span class="font-medium">{word.term}</span>
									{#if word.reading}
										<span class="text-xs text-muted-foreground">{word.reading}</span>
									{/if}
								</div>
								{#if firstSense}
									<span class="truncate text-xs text-muted-foreground">
										{firstSense.glosses.map((g) => g.text).join(', ')}
									</span>
								{/if}
							</div>
							<ChevronRightIcon class="size-4 shrink-0 text-muted-foreground" />
						</button>
					{/each}
				</div>
			{/if}
		</div>

		{#if showWordDrawer}
		<Drawer.NestedRoot bind:open={wordDrawerOpen} direction="bottom">
			<Drawer.Content class="max-h-[90vh]! md:max-h-[60vh]!">
				<Drawer.Header>
					<Drawer.Title>{selectedWord?.term ?? ''}</Drawer.Title>
					{#if selectedWord?.reading}
						<Drawer.Description>{selectedWord.reading}</Drawer.Description>
					{/if}
				</Drawer.Header>

				<div class="flex-1 overflow-y-auto px-4 pb-6">
					{#if selectedWord}
						{@const entry = selectedWord}
						<Card.Root class="border border-border">
							<Card.Content class="flex flex-col gap-4 p-4">
								<div class="flex items-center gap-2">
									<LanguageFlag language={entry.language} class="size-6" />
									{#if entry.common}
										<Badge class="w-fit bg-yellow-500 px-1.5 py-0 text-[9px] text-black">
											common
										</Badge>
									{/if}
								</div>

								<div class="grid gap-2 md:grid-cols-[auto_1fr] md:gap-6">
									<div
										class="border-r-none flex flex-row items-center gap-2 border-border pr-6 md:flex-col md:items-start md:gap-0 md:border-r"
									>
										{#if entry.reading}
											<div
												class="order-2 mb-0 text-base text-muted-foreground md:order-first md:mb-2"
											>
												{entry.reading}
											</div>
										{/if}
										<div class="text-2xl font-bold text-foreground md:text-5xl">
											{entry.term}
										</div>
									</div>

									<div class="space-y-4">
										{#each entry.senses as sense, senseIdx (senseIdx)}
											<div class="space-y-2">
												<div class="flex items-center gap-2">
													<span class="text-lg font-semibold text-foreground">{senseIdx + 1}.</span>
													{#if sense.partOfSpeech}
														<span
															class="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
														>
															{sense.partOfSpeech}
														</span>
													{/if}
												</div>

												{#if sense.glosses.length > 0}
													<div class="space-y-1">
														{#each sense.glosses as gloss, glossIdx (glossIdx)}
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

												{#if sense.examples && sense.examples.length > 0}
													<div class="mt-2 flex flex-col gap-2 border-l-2 border-border pl-4">
														{#each sense.examples as example, exIdx (exIdx)}
															<div class="space-y-0.5">
																{#each example.sentences as sentence}
																	<p
																		class="text-base {sentence.lang === entry.language
																			? 'text-foreground'
																			: 'text-muted-foreground italic'}"
																	>
																		{sentence.text}
																	</p>
																{/each}
															</div>
														{/each}
													</div>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					{/if}
				</div>
			</Drawer.Content>
		</Drawer.NestedRoot>
		{/if}
	</Drawer.Content>
</Drawer.Root>
