<script lang="ts">
	import type { WordEntry } from '$lib/dictionary/core/dictionary';

	interface Props {
		selectedText: string;
		entries: WordEntry[];
		loading?: boolean;
		onClose: () => void;
	}

	let { selectedText, entries, loading = false, onClose }: Props = $props();

	let boxEl: HTMLDivElement;
	let isDragging = $state(false);
	let offsetY = $state(0);
	let dragStartY = 0;
	let dragStartOffset = 0;

	const MAX_TEXT_LENGTH = 80;
	let displayText = $derived(
		selectedText.length > MAX_TEXT_LENGTH
			? selectedText.slice(0, MAX_TEXT_LENGTH) + '…'
			: selectedText
	);

	function onPointerDown(e: PointerEvent) {
		isDragging = true;
		dragStartY = e.clientY;
		dragStartOffset = offsetY;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!isDragging || !boxEl) return;

		const delta = e.clientY - dragStartY;
		const newOffset = dragStartOffset + delta;

		const boxHeight = boxEl.offsetHeight;
		const vh = window.innerHeight;
		const gap = 16;

		const minOffset = gap + boxHeight - vh;
		const maxOffset = gap;

		offsetY = Math.max(minOffset, Math.min(maxOffset, newOffset));
	}

	function onPointerUp() {
		isDragging = false;
	}
</script>

<button
	class="fixed inset-0 z-9998 cursor-default appearance-none border-none bg-transparent"
	onclick={onClose}
	aria-label="Close dictionary lookup"
></button>

<div
	bind:this={boxEl}
	class="fixed right-4 bottom-4 left-4 z-9999 mx-auto max-w-lg touch-none rounded-xl border border-border bg-card shadow-lg select-none"
	class:shadow-xl={isDragging}
	style="transform: translateY({offsetY}px)"
	onclick={(e) => e.stopPropagation()}
	onkeydown={(e) => e.stopPropagation()}
	role="dialog"
	tabindex="-1"
	aria-label="Dictionary lookup"
>
	<!-- Drag handle -->
	<div
		class="flex cursor-grab touch-none justify-center pt-2.5 pb-1 active:cursor-grabbing"
		role="separator"
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onlostpointercapture={onPointerUp}
	>
		<div class="h-1 w-8 rounded-full bg-muted-foreground/30"></div>
	</div>

	<div class="flex max-h-[60vh] flex-col gap-2 overflow-y-auto px-4 pb-4">
		<p class="text-2xl text-muted-foreground">{displayText}</p>
		<div class="h-0.5 w-full bg-muted"></div>

		{#if loading}
			<p class="animate-pulse text-base text-muted-foreground">Looking up…</p>
		{:else if entries.length > 0}
			<div class="flex flex-col gap-3">
				{#each entries.slice(0, 3) as entry, i}
					<div
						class="flex flex-col gap-1"
						class:border-t={i > 0}
						class:border-border={i > 0}
						class:pt-3={i > 0}
					>
						<div class="flex flex-row items-center gap-4">
							<div class="text-xl text-foreground">{entry.term}</div>
							<div>
								{#if entry.reading && entry.reading !== entry.term}
									<span class="text-sm text-muted-foreground">{entry.reading}</span>
								{/if}
							</div>
						</div>

						{#each entry.senses as sense}
							<div class="flex items-baseline gap-1.5 text-base leading-snug">
								{#if sense.partOfSpeech}
									<span
										class="shrink-0 rounded bg-secondary px-1.5 py-px text-xs text-secondary-foreground"
									>
										{sense.partOfSpeech}
									</span>
								{/if}
								<span class="text-foreground">
									{sense.glosses.map((g) => g.text).join('; ')}
								</span>
							</div>
						{/each}
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-base text-muted-foreground">No definitions found</p>
		{/if}
	</div>
</div>

<style>
	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(1rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Applied to the box — needs CSS for the animation name */
	.fixed.bottom-4 {
		animation: slideUp 0.2s ease-out;
	}
</style>
