<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { useAllBooksMetadata } from '$lib/ebook/books.svelte';
	import { isWeb } from '$lib/utils';
	import { authClient } from '$lib/auth-client';

	const books = useAllBooksMetadata();
	const session = authClient.useSession();
	let web = $state(true);

	$effect.pre(() => {
		web = isWeb();
	});

	const recentBooks = $derived(
		books.value
			.filter((b) => b.lastReadAt)
			.sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0))
			.slice(0, 4)
	);

	function openBook(id: string) {
		goto(`/ebook/${id}`);
	}

	function loginWithGoogle() {
		authClient.signIn.social({ provider: 'google' });
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

	{#if $session.isPending}
		<div class="text-sm text-muted-foreground">Loading...</div>
	{:else if !$session.data}
		<section>
			<Button onclick={loginWithGoogle} variant="outline" class="w-full gap-3 sm:w-auto">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
					<path
						fill="#EA4335"
						d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
					/>
					<path
						fill="#4285F4"
						d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
					/>
					<path
						fill="#FBBC05"
						d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"
					/>
					<path
						fill="#34A853"
						d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
					/>
				</svg>
				Login with Google
			</Button>
		</section>
	{:else}
		{#if web}
			<section>
				<a
					href="https://github.com/Neo-Ciber94/etoshokan/releases/tag/dev"
					target="_blank"
					rel="noopener noreferrer"
				>
					<Button variant="outline" class="w-full gap-2 sm:w-auto">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 32 32"
							class="shrink-0"
							><rect width="4" height="10" x="2" y="12" fill="#8bc34a" rx="2" /><rect
								width="4"
								height="10"
								x="26"
								y="12"
								fill="#8bc34a"
								rx="2"
							/><path
								fill="#8bc34a"
								d="M8 12h16v12H8zm2 12h4v4a2 2 0 0 1-2 2a2 2 0 0 1-2-2zm8 0h4v4a2 2 0 0 1-2 2a2 2 0 0 1-2-2zm3.545-19.759l2.12-2.12A1 1 0 0 0 22.251.707l-2.326 2.326a7.97 7.97 0 0 0-7.85 0L9.75.707a1 1 0 1 0-1.414 1.414l2.12 2.12A7.97 7.97 0 0 0 8 10h16a7.97 7.97 0 0 0-2.455-5.759M14 8h-2V6h2Zm6 0h-2V6h2Z"
							/></svg
						>
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
											class="h-24 w-16 shrink-0 rounded object-cover"
										/>
									{:else}
										<div
											class="flex h-24 w-16 shrink-0 items-center justify-center rounded bg-muted"
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
	{/if}
</div>
