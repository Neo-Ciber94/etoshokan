<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLHeadingElement> {}

	let { class: className, children, ...rest }: Props = $props();
</script>

<h2 class={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...rest}>
	{@render children?.()}
</h2>
