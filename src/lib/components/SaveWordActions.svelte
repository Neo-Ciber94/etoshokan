<script lang="ts">
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import type { WordEntry } from '$lib/dictionary/core/dictionary'
  import { wordsStorage, DEFAULT_CATEGORY } from '$lib/dictionary/words-storage.svelte'
  import { saveAsDialog } from './save-as-dialog.svelte'

  interface Props {
    entry: WordEntry
  }

  let { entry }: Props = $props()

  function save() {
    wordsStorage.save(entry, DEFAULT_CATEGORY)
  }

  function removeWord() {
    wordsStorage.delete(entry.term, entry.language)
  }
</script>

{#if wordsStorage.isSaved(entry.term, entry.language)}
  <DropdownMenu.Item onclick={removeWord}>Remove</DropdownMenu.Item>
{:else}
  <DropdownMenu.Item onclick={save}>Save</DropdownMenu.Item>
  <DropdownMenu.Item onclick={() => saveAsDialog.show(entry)}>Save As</DropdownMenu.Item>
{/if}
