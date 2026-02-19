<script lang="ts">
  import { useSyncBookEntries } from '$lib/ebook/sync.svelte'
  import CloudUploadIcon from '@lucide/svelte/icons/cloud-upload'
  import CloudCheckIcon from '@lucide/svelte/icons/cloud-check'
  import CloudOffIcon from '@lucide/svelte/icons/cloud-off'
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw'

  let { bookId, class: className = '' }: { bookId: string; class?: string } = $props()

  const sync = useSyncBookEntries()
  const entry = $derived.by(() => sync.value.find((x) => x.bookId === bookId))
  $inspect(entry).with(console.log)
  
</script>

{#if entry}
  {#if entry.uploadState === 'missing'}
    <button
      onclick={() => console.log('Book sync state:', entry)}
      class="inline-flex cursor-pointer items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground {className}"
      title="missing"
    >
      <CloudOffIcon class="size-3" />
      <span>missing</span>
    </button>
  {:else if entry.uploadState === 'pending'}
    <button
      onclick={() => console.log('Book sync state:', entry)}
      class="inline-flex cursor-pointer items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white {className}"
      title="pending upload"
    >
      <CloudUploadIcon class="size-3" />
      <span>pending</span>
    </button>
  {:else if entry.syncState === 'pending'}
    <button
      onclick={() => console.log('Book sync state:', entry)}
      class="inline-flex cursor-pointer items-center gap-1 rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white {className}"
      title="syncing"
    >
      <RefreshCwIcon class="size-3" />
      <span>pending</span>
    </button>
  {:else}
    <button
      onclick={() => console.log('Book sync state:', entry)}
      class="inline-flex cursor-pointer items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white {className}"
      title="synced"
    >
      <CloudCheckIcon class="size-3" />
      <span>synced</span>
    </button>
  {/if}
{/if}
