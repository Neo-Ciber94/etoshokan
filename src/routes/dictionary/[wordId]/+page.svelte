<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import LanguageFlag from '$lib/components/LanguageFlag.svelte';
	import { dictionary } from '$lib/dictionary';
	import type { WordEntry } from '$lib/dictionary/core/dictionary';
	import { ChevronLeft } from '@lucide/svelte';

	const wordId = $derived(page.params.wordId);

	let entry = $state<WordEntry | null>(null);
	let loading = $state(true);
	let error = $state('');

	$effect(() => {
		const id = wordId || '';
		loading = true;
		error = '';
		entry = null;

		(async () => {
			try {
				await dictionary.initialize();
				const result = await dictionary.getById(id);
				entry = result;
				if (!result) {
					error = 'Word not found.';
				}
			} catch (err) {
				error = err instanceof Error ? err.message : 'Failed to load word';
			} finally {
				loading = false;
			}
		})();
	});
</script>

<svelte:head>
	<title>{entry ? entry.term : 'Word'} - Etoshokan</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center gap-5">
		<Button
			variant="outline"
			class="flex flex-row gap-2 w-fit px-2"
			size="icon"
			onclick={() => goto('/dictionary')}
			aria-label="Back"
		>
			<ChevronLeft size={20} />
			<span>Back</span>
		</Button>
		<h2 class="text-2xl font-semibold">{entry?.term ?? 'Loading...'}</h2>
	</div>

	{#if loading}
		<div class="rounded-md border border-border bg-muted p-8 text-center">
			<p class="text-sm text-muted-foreground">Loading...</p>
		</div>
	{:else if error}
		<div class="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
	{:else if entry}
		<Card.Root class="border border-border">
			<Card.Content class="flex flex-col gap-4 p-4 md:p-6">
				<div class="flex items-center gap-2">
					<LanguageFlag language={entry.language} class="size-6" />
					{#if entry.common}
						<Badge
							class="w-fit bg-emerald-800 px-1.5 py-0 text-[9px] text-white hover:bg-emerald-800"
						>
							common
						</Badge>
					{/if}
				</div>

				<div class="grid gap-2 md:grid-cols-[auto_1fr] md:gap-6">
					<div
						class="border-r-none flex flex-row items-center gap-2 border-border pr-6 md:flex-col md:items-start md:gap-0 md:border-r"
					>
						{#if entry.reading}
							<div class="order-2 mb-0 text-base text-muted-foreground md:order-first md:mb-2">
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
														class="text-sm {sentence.lang === entry.language
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
