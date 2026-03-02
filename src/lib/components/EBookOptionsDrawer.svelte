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
		showPageProgress: { value: boolean };
		swipeNavigation: { value: boolean };
		pageTransitions: { value: boolean };
	}

	let {
		open = $bindable(),
		zoom,
		onZoomIn,
		onZoomOut,
		showPageProgress,
		swipeNavigation,
		pageTransitions
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
			<!-- Page transitions toggle -->
			<label class="flex items-center justify-between">
				<span class="text-sm font-medium">Page transitions</span>
				<Switch bind:checked={pageTransitions.value} />
			</label>
			<!-- Page indicator toggle -->
			<label class="flex items-center justify-between">
				<span class="text-sm font-medium">Show progress</span>
				<Switch bind:checked={showPageProgress.value} />
			</label>

			<!-- Swipe navigation -->
			<label class="flex items-center justify-between">
				<span class="text-sm font-medium">Swipe navigation</span>
				<Switch bind:checked={swipeNavigation.value} />
			</label>
		</div>
	</Drawer.Content>
</Drawer.Root>
