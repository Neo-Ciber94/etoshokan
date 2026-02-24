<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	type Language = 'all' | 'en' | 'es';

	let {
		open = $bindable(false),
		language = $bindable<Language>('all'),
		maxResults = $bindable(5)
	}: {
		open?: boolean;
		language?: Language;
		maxResults?: number;
	} = $props();

	const languages: { value: Language; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'en', label: 'English' },
		{ value: 'es', label: 'Spanish' }
	];
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-xs">
		<Dialog.Header>
			<Dialog.Title>Search Options</Dialog.Title>
		</Dialog.Header>

		<div class="space-y-5 py-2">
			<div class="space-y-2">
				<p class="text-sm font-medium">Language</p>
				<div class="flex gap-2">
					{#each languages as lang}
						<button
							onclick={() => (language = lang.value)}
							class="flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors {language ===
							lang.value
								? 'border-foreground bg-foreground text-background'
								: 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}"
						>
							{lang.label}
						</button>
					{/each}
				</div>
			</div>

			<div class="space-y-2">
				<label for="max-results" class="text-sm font-medium">Max Results</label>
				<Input
					id="max-results"
					type="number"
					min="1"
					max="50"
					bind:value={maxResults}
				/>
			</div>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (open = false)} class="w-full">Done</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
