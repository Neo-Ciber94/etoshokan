<script lang="ts">
	import { toggleTheme, useIsDarkMode } from '$lib/runes/theme.svelte';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { cn } from '$lib/utils';

	type Props = {
		classname?: string;
	};

	const isDarkMode = useIsDarkMode();
	let { classname }: Props = $props();
</script>

<button
	onclick={() => {
		toggleTheme();
	}}
	class={cn(
		'rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
		classname
	)}
	aria-label="Toggle theme"
>
	{#if isDarkMode.value}
		<SunIcon class="size-5" />
	{:else}
		<MoonIcon class="size-5" />
	{/if}
</button>
