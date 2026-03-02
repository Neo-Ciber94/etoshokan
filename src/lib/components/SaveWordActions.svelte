<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import type { WordEntry } from '$lib/dictionary/core/dictionary';
	import { useSavedWords } from '$lib/data/words/words-storage.svelte';
	import { saveAsDialog } from './save-as-dialog.svelte';
	import { DEFAULT_CATEGORY } from '$lib/data/words/words-collection';

	interface Props {
		category?: string;
		entry: WordEntry;
	}

	let { entry, category }: Props = $props();

	const savedWords = useSavedWords();

	function save() {
		savedWords.save(entry, category ?? DEFAULT_CATEGORY);
	}

	function removeWord() {
		savedWords.delete(entry.id);
	}
</script>

{#if savedWords.isSaved(entry.id)}
	<DropdownMenu.Item onclick={removeWord}>Remove</DropdownMenu.Item>
{:else}
	<DropdownMenu.Item onclick={save}>Save</DropdownMenu.Item>
	<DropdownMenu.Item onclick={() => saveAsDialog.show(entry)}>Save As</DropdownMenu.Item>
{/if}
