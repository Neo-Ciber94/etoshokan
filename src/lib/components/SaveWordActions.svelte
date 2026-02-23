<script lang="ts">
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import * as Dialog from '$lib/components/ui/dialog'
  import type { WordEntry } from '$lib/dictionary/core/dictionary'
  import { wordsStorage, DEFAULT_CATEGORY } from '$lib/dictionary/words-storage.svelte'

  interface Props {
    entry: WordEntry
  }

  let { entry }: Props = $props()

  let dialogOpen = $state(false)

  function save() {
    wordsStorage.save(entry, DEFAULT_CATEGORY)
  }

  function saveAs(category: string) {
    wordsStorage.save(entry, category)
    dialogOpen = false
  }

  function createAndSave() {
    const name = prompt('Category name:')
    if (!name?.trim()) return
    wordsStorage.save(entry, name.trim())
    dialogOpen = false
  }

  function removeWord() {
    wordsStorage.delete(entry.term, entry.language)
  }
</script>

{#if wordsStorage.isSaved(entry.term, entry.language)}
  <DropdownMenu.Item onclick={removeWord}>Remove</DropdownMenu.Item>
{:else}
  <DropdownMenu.Item onclick={save}>Save</DropdownMenu.Item>
  <DropdownMenu.Item onclick={() => (dialogOpen = true)}>Save As</DropdownMenu.Item>
{/if}

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Content class="max-w-xs">
    <Dialog.Header>
      <Dialog.Title>Save to category</Dialog.Title>
    </Dialog.Header>
    <div class="flex flex-col gap-1 py-2">
      {#each wordsStorage.categoryNames as category (category)}
        <button
          onclick={() => saveAs(category)}
          class="rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
        >
          {category}
        </button>
      {/each}
    </div>
    <Dialog.Footer>
      <button
        onclick={createAndSave}
        class="text-sm text-muted-foreground hover:text-foreground"
      >
        + New Category
      </button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
