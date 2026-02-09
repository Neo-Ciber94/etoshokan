<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
</script>

<div class="space-y-8">
	<section class="space-y-4">
		<div class="space-y-2">
			<h2 class="text-xl font-semibold">Ebook Reader</h2>
			<p class="text-sm text-slate-600 dark:text-slate-400">
				Read your ebooks with integrated dictionary lookup
			</p>
		</div>
	</section>

	<section class="space-y-4">
		<Card.Root class="border border-slate-200 dark:border-slate-800">
			<Card.Content class="p-8">
				<div class="flex flex-col items-center justify-center space-y-6 text-center">
					<div class="text-6xl">📚</div>
					<div class="space-y-2">
						<h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
							Ebook Reader Coming Soon
						</h3>
						<p class="text-sm text-slate-600 dark:text-slate-400 max-w-md">
							This is a placeholder for the ebook reader. You'll be able to open and read EPUB
							files with integrated dictionary lookup for Japanese text.
						</p>
					</div>
					<Button variant="outline" disabled>
						Open Ebook
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	</section>
</div>
