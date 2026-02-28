<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import type { WordEntry } from '$lib/dictionary/core/dictionary';
	import { useSavedWords, DEFAULT_CATEGORY } from '$lib/data/words/words-storage.svelte';
	import { saveAsDialog } from './save-as-dialog.svelte';

	interface Props {
		entry: WordEntry;
	}

	let { entry }: Props = $props();

	const savedWords = useSavedWords();

	function save() {
		savedWords.save(entry, DEFAULT_CATEGORY);
	}

	function removeWord() {
		savedWords.delete(entry.term, entry.language);
	}
</script>

{#if savedWords.isSaved(entry.term, entry.language)}
	<DropdownMenu.Item onclick={removeWord}>Remove</DropdownMenu.Item>
{:else}
	<DropdownMenu.Item onclick={save}>Save</DropdownMenu.Item>
	<DropdownMenu.Item onclick={() => saveAsDialog.show(entry)}>Save As</DropdownMenu.Item>
{/if}
