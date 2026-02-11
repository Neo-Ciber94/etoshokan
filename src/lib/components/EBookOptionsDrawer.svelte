<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Drawer from '$lib/components/ui/drawer';
	import { Switch } from '$lib/components/ui/switch';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import PlusIcon from '@lucide/svelte/icons/plus';

	interface Props {
		open: boolean;
		zoom: number;
		onZoomIn: () => void;
		onZoomOut: () => void;
		showPageIndicator: { value: boolean };
		searchOnSelection: { value: boolean };
		selectionTime: { value: number };
		disableContextMenu: { value: boolean };
		swipeNavigation: { value: boolean };
		invertDirection: { value: boolean };
	}

	let {
		open = $bindable(),
		zoom,
		onZoomIn,
		onZoomOut,
		showPageIndicator,
		searchOnSelection,
		selectionTime,
		disableContextMenu,
		swipeNavigation,
		invertDirection
	}: Props = $props();
</script>

<Drawer.Root bind:open direction="bottom">
	<Drawer.Content>
		<Drawer.Header>
			<Drawer.Title>Options</Drawer.Title>
		</Drawer.Header>
		<div class="flex flex-col gap-6 px-4 pb-6">
			<!-- Zoom control -->
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium">Zoom</span>
				<div class="flex items-center gap-3">
					<Button onclick={onZoomOut} variant="outline" size="icon-sm" disabled={zoom <= 100}>
						<MinusIcon class="size-4" />
					</Button>
					<span class="w-12 text-center text-sm tabular-nums">{zoom}%</span>
					<Button onclick={onZoomIn} variant="outline" size="icon-sm" disabled={zoom >= 200}>
						<PlusIcon class="size-4" />
					</Button>
				</div>
			</div>
			<!-- Page indicator toggle -->
			<label class="flex items-center justify-between">
				<span class="text-sm font-medium">Show page number</span>
				<Switch bind:checked={showPageIndicator.value} />
			</label>
			<!-- Search on selection toggle -->
			<label class="flex items-center justify-between">
				<span class="text-sm font-medium">Search on selection</span>
				<Switch bind:checked={searchOnSelection.value} />
			</label>
			<!-- Selection time control -->
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium">Selection time</span>
				<div class="flex items-center gap-3">
					<Button
						onclick={() => (selectionTime.value = Math.max(0, selectionTime.value - 50))}
						variant="outline"
						size="icon-sm"
						disabled={selectionTime.value <= 0}
					>
						<MinusIcon class="size-4" />
					</Button>
					<span class="w-16 text-center text-sm tabular-nums">{selectionTime.value}ms</span>
					<Button
						onclick={() => (selectionTime.value = Math.min(500, selectionTime.value + 50))}
						variant="outline"
						size="icon-sm"
						disabled={selectionTime.value >= 500}
					>
						<PlusIcon class="size-4" />
					</Button>
				</div>
			</div>

			<!-- Invert direction -->
			<label class="flex items-center justify-between">
				<span class="text-sm font-medium">Invert direction</span>
				<Switch bind:checked={invertDirection.value} />
			</label>
			<!-- Swipe navigation -->
			<label class="flex items-center justify-between">
				<span class="text-sm font-medium">Swipe navigation</span>
				<Switch bind:checked={swipeNavigation.value} />
			</label>
			<!-- Disable context menu -->
			<label class="flex items-center justify-between">
				<span class="text-sm font-medium">Disable context menu</span>
				<Switch bind:checked={disableContextMenu.value} />
			</label>
		</div>
	</Drawer.Content>
</Drawer.Root>
