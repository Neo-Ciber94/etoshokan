<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { useSavedWords } from '$lib/data/words/words-storage.svelte';
	import { saveAsDialog } from './save-as-dialog.svelte';
	import Button from './ui/button/button.svelte';

	const savedWords = useSavedWords();

	function saveToCategory(category: string) {
		if (saveAsDialog.entry) {
			savedWords.save(saveAsDialog.entry, category);
		}
		saveAsDialog.close();
	}
</script>

<Dialog.Root bind:open={saveAsDialog.open}>
	<Dialog.Content class="max-w-xs">
		<Dialog.Header>
			<Dialog.Title>Save to category</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-1 py-2">
			{#each savedWords.categoryNames as category (category)}
				<Button
					variant="outline"
					onclick={() => saveToCategory(category)}
					class="justify-start rounded-md px-3 py-2 text-sm"
				>
					{category}
				</Button>
			{/each}
		</div>
		<Dialog.Footer>
			<Button onclick={() => saveAsDialog.promptAddCategory()} class="text-sm"
				>+ New Category</Button
			>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
