<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { wordsStorage } from '$lib/dictionary/words-storage.svelte';
	import { editCategoryDialog } from './edit-category-dialog.svelte';

	let newName = $state('');

	$effect(() => {
		if (editCategoryDialog.open) {
			newName = editCategoryDialog.categoryName;
		}
	});

	function save() {
		const trimmed = newName.trim();

		if (!trimmed) {
			return;
		}

		wordsStorage.renameCategory(editCategoryDialog.categoryName, trimmed);
		editCategoryDialog.close();
	}

	function deleteCategory() {
		if (!confirm(`Do you want to delete all the words on '${editCategoryDialog.categoryName}'?`)) {
			return;
		}

		wordsStorage.deleteCategory(editCategoryDialog.categoryName);
		editCategoryDialog.close();
	}
</script>

<Dialog.Root bind:open={editCategoryDialog.open}>
	<Dialog.Content class="max-w-xs">
		<Dialog.Header>
			<Dialog.Title>Edit category</Dialog.Title>
		</Dialog.Header>
		<div class="py-2">
			<Input
				bind:value={newName}
				placeholder="Category name"
				onkeydown={(e) => e.key === 'Enter' && save()}
			/>
		</div>
		<Dialog.Footer class="flex-row gap-2">
			<Button onclick={save} class="w-1/2">Save</Button>
			<Button variant="destructive" onclick={deleteCategory} class="w-1/2">Delete Category</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
