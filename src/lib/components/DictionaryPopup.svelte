<script lang="ts">
	import type { WordEntry } from '$lib/dictionary/core/dictionary';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		word: string;
		entries: WordEntry[];
		position: { x: number; y: number };
		onClose: () => void;
	}

	let { word, entries, position, onClose }: Props = $props();
</script>

{#if entries.length > 0}
	<!-- Backdrop to capture outside clicks -->
	<div
		class="dictionary-backdrop"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		role="button"
		tabindex="-1"
		aria-label="Close dictionary"
	></div>

	<div
		class="dictionary-popup"
		style="left: {position.x}px; top: {position.y}px;"
		role="dialog"
		aria-label="Dictionary definition"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
	>
		<Card.Root class="border border-border shadow-lg max-w-md">
			<Card.Content class="p-4">
				<div class="flex items-start justify-between mb-3">
					<div class="flex-1">
						<h3 class="text-lg font-semibold text-foreground">
							{entries[0].term}
						</h3>
						{#if entries[0].reading && entries[0].reading !== entries[0].term}
							<p class="text-sm text-muted-foreground mt-1">
								{entries[0].reading}
							</p>
						{/if}
					</div>
					<Button variant="ghost" size="sm" onclick={onClose} class="h-8 w-8 p-0">
						✕
					</Button>
				</div>

				<div class="space-y-3 max-h-96 overflow-y-auto">
					{#each entries.slice(0, 3) as entry}
						<div class="space-y-2">
							{#each entry.senses as sense}
								<div class="text-sm">
									{#if sense.partOfSpeech}
										<span class="inline-block px-2 py-0.5 text-xs rounded bg-secondary text-secondary-foreground mb-1">
											{sense.partOfSpeech}
										</span>
									{/if}
									<div class="space-y-1">
										{#each sense.glosses as gloss}
											<p class="text-foreground">
												• {gloss.text}
											</p>
										{/each}
									</div>
									{#if sense.notes && sense.notes.length > 0}
										<p class="text-xs text-muted-foreground mt-1 italic">
											{sense.notes.join(', ')}
										</p>
									{/if}
								</div>
							{/each}
						</div>
					{/each}

					{#if entries.length > 3}
						<p class="text-xs text-muted-foreground text-center pt-2 border-t border-border">
							+{entries.length - 3} more definitions
						</p>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
{/if}

<style>
	.dictionary-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 9998;
		background: transparent;
		cursor: default;
	}

	.dictionary-popup {
		position: fixed;
		z-index: 9999;
		animation: fadeIn 0.15s ease-out;
		width: 90%;
		max-width: calc(100vw - 2rem);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
