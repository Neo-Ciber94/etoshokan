<script lang="ts">
	import { getModals, closeTopModal, type ModalType } from './modal.svelte';
	import Loading from '$lib/components/Loading.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import XIcon from '@lucide/svelte/icons/x';
	import InfoIcon from '@lucide/svelte/icons/info';
	import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
	import CircleXIcon from '@lucide/svelte/icons/circle-x';

	const modals = $derived(getModals());
	let open = $derived(modals.length > 0);

	const typeConfig: Record<ModalType, { bg: string; iconColor: string }> = {
		info: { bg: 'bg-blue-500/10', iconColor: 'text-blue-500' },
		error: { bg: 'bg-red-500/10', iconColor: 'text-red-500' },
		warning: { bg: 'bg-amber-500/10', iconColor: 'text-amber-500' },
		pending: { bg: 'bg-muted/50', iconColor: 'text-muted-foreground' }
	};

	function handleOpenChange(value: boolean) {
		if (!value) {
			closeTopModal();
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Portal>
		{#each modals as modal, i (modal.id)}
			{@const config = typeConfig[modal.type]}
			{@const isTop = i === modals.length - 1}
			<Dialog.Content
				class="z-50 w-full max-w-[calc(100%-2rem)] animate-in rounded-lg border bg-background p-6 shadow-lg duration-200 fade-in-0 zoom-in-95 sm:max-w-md"
				role="dialog"
				aria-modal={isTop}
				aria-label={modal.title}
			>
				{#if modal.canClose}
					<button
						class="absolute end-4 top-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden"
						onclick={() => {
							const idx = getModals().findIndex((m) => m.id === modal.id);
							if (idx !== -1) {
								getModals().splice(idx, 1);
							}
						}}
					>
						<XIcon class="size-4" />
						<span class="sr-only">Close</span>
					</button>
				{/if}

				<Dialog.Header class="flex-row items-start gap-3">
					<div class="flex size-8 shrink-0 items-center justify-center rounded-full {config.bg}">
						{#if modal.type === 'pending'}
							<Loading class="size-4" />
						{:else if modal.type === 'error'}
							<CircleXIcon class="size-4 {config.iconColor}" />
						{:else if modal.type === 'warning'}
							<AlertTriangleIcon class="size-4 {config.iconColor}" />
						{:else}
							<InfoIcon class="size-4 {config.iconColor}" />
						{/if}
					</div>
					<div class="flex-1 space-y-1.5 text-start">
						<Dialog.Title>{modal.title}</Dialog.Title>
						{#if modal.description}
							<Dialog.Description>{modal.description}</Dialog.Description>
						{/if}
					</div>
				</Dialog.Header>

				{#if modal.type !== 'pending' && modal.actions.length > 0}
					<Dialog.Footer class="mt-4">
						{#each modal.actions as action}
							<Button variant="outline" size="sm" onclick={action.onclick}>
								{action.name}
							</Button>
						{/each}
					</Dialog.Footer>
				{/if}
			</Dialog.Content>
		{/each}
	</Dialog.Portal>
</Dialog.Root>
