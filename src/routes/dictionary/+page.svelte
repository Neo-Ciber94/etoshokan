<script lang="ts">
  import * as Tabs from '$lib/components/ui/tabs'
  import { Search, Bookmark } from '@lucide/svelte'
  import SearchTab from './SearchTab.svelte'
  import WordsTab from './WordsTab.svelte'
</script>

<svelte:head>
  <title>Etoshokan - Dictionary</title>
</svelte:head>

<div class="space-y-6">
  <h2 class="text-xl font-semibold">Dictionary</h2>

  <Tabs.Root value="search">
    <Tabs.List class="w-full">
      <Tabs.Trigger value="search" class="flex-1"><Search size={15} />Search</Tabs.Trigger>
      <Tabs.Trigger value="words" class="flex-1"><Bookmark size={15} />Words</Tabs.Trigger>
    </Tabs.List>
    <Tabs.Content value="search" class="space-y-4 pt-2">
      <SearchTab />
    </Tabs.Content>
    <Tabs.Content value="words" class="pt-2">
      <WordsTab />
    </Tabs.Content>
  </Tabs.Root>
</div>
