<script lang="ts">
  let hovered = $state(false)
  let showKana = $state([false, false, false])

  const chars = [
    { kanji: '図', kana: 'と' },
    { kanji: '書', kana: 'しょ' },
    { kanji: '館', kana: 'かん' },
  ]

  $effect(() => {
    const target = hovered
    const timeouts = chars.map((_, i) =>
      setTimeout(() => {
        showKana[i] = target
      }, i * 80)
    )
    return () => timeouts.forEach(clearTimeout)
  })
</script>

<a
  href="/"
  class="flex select-none items-center gap-2 w-32 whitespace-nowrap"
  onmouseenter={() => (hovered = true)}
  onmouseleave={() => (hovered = false)}
>
  <img src="/app-icon-32.png" alt="図書館" class="size-8" />
  <span class="hidden items-baseline text-xl font-bold text-primary lg:inline-flex gap-1">
    {#each chars as char, i}
      <span>{showKana[i] ? char.kana : char.kanji}</span>
    {/each}
  </span>
</a>
