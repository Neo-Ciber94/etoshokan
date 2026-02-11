<script lang="ts">
	import * as Drawer from '$lib/components/ui/drawer';
	import type { NavItem } from 'epubjs';

	interface Props {
		open: boolean;
		toc: NavItem[];
		currentHref: string;
		onNavigate: (href: string) => void;
	}

	let { open = $bindable(), toc, currentHref, onNavigate }: Props = $props();

	function isActive(itemHref: string): boolean {
		const normalize = (h: string) => h.split('#')[0];
		return normalize(itemHref) === normalize(currentHref);
	}
</script>

<Drawer.Root bind:open direction="bottom">
	<Drawer.Content>
		<Drawer.Header>
			<Drawer.Title>Table of Contents</Drawer.Title>
		</Drawer.Header>
		<div class="flex max-h-[60vh] flex-col overflow-y-auto px-4 pb-6">
			{#if toc.length === 0}
				<p class="py-4 text-center text-sm text-muted-foreground">
					No table of contents available
				</p>
			{:else}
				{#each toc as item}
					<button
						class="rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent {isActive(
							item.href
						)
							? 'bg-accent font-medium text-accent-foreground'
							: 'text-muted-foreground'}"
						aria-current={isActive(item.href) ? 'true' : undefined}
						onclick={() => {
							onNavigate(item.href);
							open = false;
						}}
					>
						{item.label.trim()}
					</button>
					{#if item.subitems}
						{#each item.subitems as subitem}
							<button
								class="rounded-md py-2 pl-6 pr-3 text-left text-sm transition-colors hover:bg-accent {isActive(
									subitem.href
								)
									? 'bg-accent font-medium text-accent-foreground'
									: 'text-muted-foreground'}"
								aria-current={isActive(subitem.href) ? 'true' : undefined}
								onclick={() => {
									onNavigate(subitem.href);
									open = false;
								}}
							>
								{subitem.label.trim()}
							</button>
						{/each}
					{/if}
				{/each}
			{/if}
		</div>
	</Drawer.Content>
</Drawer.Root>
