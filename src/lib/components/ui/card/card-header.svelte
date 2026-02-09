<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {}

	let { class: className, children, ...rest }: Props = $props();
</script>

<div class={cn('flex flex-col space-y-1.5 border-b border-slate-200 p-6 dark:border-slate-800', className)} {...rest}>
	{@render children?.()}
</div>
