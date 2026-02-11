<script lang="ts">
	import SearchIcon from '@lucide/svelte/icons/search';
	import LanguageIcon from '@lucide/svelte/icons/languages';

	let {
		open = $bindable(false),
		x = 0,
		y = 0,
		onTranslate,
		onSearch
	}: {
		open: boolean;
		x: number;
		y: number;
		onTranslate?: () => void;
		onSearch?: () => void;
	} = $props();

	let menuEl: HTMLDivElement | undefined = $state();

	// Snapshot position at open time so it doesn't move with pointer
	let anchorX = $state(0);
	let anchorY = $state(0);
	let posX = $state(0);
	let posY = $state(0);
	let prevOpen = $state(false);

	$effect(() => {
		// Capture x/y only on the rising edge of open
		if (open && !prevOpen) {
			anchorX = x;
			anchorY = y;
		}
		prevOpen = open;
	});

	$effect(() => {
		if (open && menuEl) {
			const rect = menuEl.getBoundingClientRect();
			const pad = 8;
			let nx = anchorX;
			let ny = anchorY;

			if (nx + rect.width > window.innerWidth - pad) {
				nx = window.innerWidth - rect.width - pad;
			}
			if (nx < pad) nx = pad;

			if (ny + rect.height > window.innerHeight - pad) {
				ny = window.innerHeight - rect.height - pad;
			}
			if (ny < pad) ny = pad;

			posX = nx;
			posY = ny;
		}
	});

	function handleItemClick(ev: Event, callback?: () => void) {
		open = false;
		ev.stopPropagation();
		ev.preventDefault();
		callback?.();
	}
</script>

{#if open}
	<div
		bind:this={menuEl}
		class="fixed z-51 min-w-40 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
		style="left: {posX}px; top: {posY}px;"
		role="menu"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="flex cursor-default select-none items-center gap-3 rounded-sm px-3 py-2.5 text-base hover:bg-accent hover:text-accent-foreground md:gap-2 md:px-2 md:py-1.5 md:text-sm"
			role="menuitem"
			tabindex="-1"
			onpointerup={(ev) => handleItemClick(ev, onTranslate)}
		>
			<LanguageIcon class="size-5 md:size-4" />
			Translate
		</div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="flex cursor-default select-none items-center gap-3 rounded-sm px-3 py-2.5 text-base hover:bg-accent hover:text-accent-foreground md:gap-2 md:px-2 md:py-1.5 md:text-sm"
			role="menuitem"
			tabindex="-1"
			onpointerup={(ev) => handleItemClick(ev, onSearch)}
		>
			<SearchIcon class="size-5 md:size-4" />
			Search
		</div>
	</div>
{/if}
