<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { useAllBooksMetadata } from '$lib/ebook/books.svelte';
	import { isWeb } from '$lib/utils';

	const books = useAllBooksMetadata();
	const web = isWeb();

	const recentBooks = $derived(
		books.value
			.filter((b) => b.lastReadAt)
			.sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0))
			.slice(0, 4)
	);

	function openBook(id: string) {
		goto(`/ebook/${id}`);
	}
</script>

<svelte:head>
	<title>Etoshokan</title>
</svelte:head>

<div class="space-y-8">
	<section class="space-y-2">
		<h2 class="text-2xl font-bold">Welcome to Etoshokan</h2>
		<p class="text-sm text-muted-foreground">
			Your personal Japanese reading companion — ebook reader and dictionary.
		</p>
	</section>

	{#if web}
		<section>
			<a
				href="https://github.com/Neo-Ciber94/etoshokan/releases/tag/dev"
				target="_blank"
				rel="noopener noreferrer"
			>
				<Button variant="outline" class="w-full sm:w-auto">
					Download Android APK
				</Button>
			</a>
		</section>
	{/if}

	<section class="space-y-4">
		<h3 class="text-lg font-semibold">Continue Reading</h3>

		{#if books.loading}
			<div class="text-sm text-muted-foreground">Loading...</div>
		{:else if recentBooks.length === 0}
			<Card.Root class="border border-border">
				<Card.Content class="p-8 text-center">
					<p class="text-sm text-muted-foreground">
						No books in progress. Head to the
						<a href="/ebook" class="text-primary underline">Ebook Reader</a>
						to upload and start reading.
					</p>
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2">
				{#each recentBooks as book (book.id)}
					<Card.Root class="border border-border transition-colors hover:border-primary/50">
						<Card.Content class="p-4">
							<div class="flex gap-4">
								{#if book.cover}
									<img
										src={book.cover}
										alt={book.title}
										class="h-24 w-16 flex-shrink-0 rounded object-cover"
									/>
								{:else}
									<div
										class="flex h-24 w-16 flex-shrink-0 items-center justify-center rounded bg-muted"
									>
										<span class="text-2xl">📖</span>
									</div>
								{/if}
								<div class="flex flex-1 flex-col justify-between">
									<div>
										<h4 class="line-clamp-1 text-sm font-semibold">{book.title}</h4>
										<p class="line-clamp-1 text-xs text-muted-foreground">{book.author}</p>
									</div>
									{#if book.progress}
										<div>
											<div class="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
												<div
													class="h-full bg-primary transition-all"
													style="width: {book.progress}%"
												></div>
											</div>
											<p class="mt-1 text-xs text-muted-foreground">
												{book.progress}% complete
											</p>
										</div>
									{/if}
									<Button onclick={() => openBook(book.id)} size="sm" class="mt-2 w-full">
										Continue
									</Button>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</section>
</div>
