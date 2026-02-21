<script lang="ts">
  import * as Card from '$lib/components/ui/card'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { Badge } from '$lib/components/ui/badge'
  import { wordsStorage } from './words-storage.svelte'
</script>

<section class="space-y-4">
  {#if wordsStorage.words.length > 0}
    <div class="grid gap-6">
      {#each wordsStorage.words as entry (entry.term + entry.language)}
        <Card.Root class="border border-border py-2 md:py-6">
          <Card.Content class="flex flex-col gap-2 px-4 py-1 md:px-6">
            <div class="flex items-start justify-between gap-2">
              {#if entry.common}
                <Badge
                  class="w-fit bg-emerald-800 px-1.5 py-0 text-[9px] text-white hover:bg-emerald-800"
                >common</Badge>
              {:else}
                <div></div>
              {/if}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <button
                    class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Options"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  <DropdownMenu.Item onclick={() => wordsStorage.delete(entry.term, entry.language)}>
                    Delete
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </div>

            <div class="grid gap-2 md:grid-cols-[auto_1fr] md:gap-6">
              <!-- Left side: Word and Reading -->
              <div
                class="border-r-none flex flex-row items-center gap-2 border-border pr-6 md:flex-col md:items-start md:gap-0 md:border-r"
              >
                {#if entry.reading}
                  <div class="order-2 mb-0 text-base text-muted-foreground md:order-0 md:mb-2">
                    {entry.reading}
                  </div>
                {/if}
                <div class="text-2xl font-bold text-foreground md:text-5xl">
                  {entry.term}
                </div>
              </div>

              <!-- Right side: Meanings -->
              <div class="space-y-2 md:space-y-4">
                {#each entry.senses as sense, senseIdx (senseIdx)}
                  <div class="space-y-1 md:space-y-2">
                    <div class="flex items-center gap-2">
                      <span class="text-lg font-semibold text-foreground">
                        {senseIdx + 1}.
                      </span>
                      {#if sense.partOfSpeech}
                        <span
                          class="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                        >
                          {sense.partOfSpeech}
                        </span>
                      {/if}
                    </div>

                    {#if sense.glosses}
                      <div class="space-y-1">
                        {#each sense.glosses as gloss, glossIdx}
                          <div class="text-sm text-foreground md:text-base">
                            {#if sense.glosses.length > 1}
                              <span class="text-muted-foreground">{glossIdx + 1}.</span>
                            {/if}
                            {gloss.text}
                          </div>
                        {/each}
                      </div>
                    {/if}

                    {#if sense.notes && sense.notes.length > 0}
                      <div class="text-sm text-muted-foreground italic">
                        {sense.notes.join('; ')}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {:else}
    <div class="rounded-md border border-border bg-muted p-8 text-center">
      <p class="text-sm text-muted-foreground">No saved words yet. Save words from the search tab.</p>
    </div>
  {/if}
</section>
