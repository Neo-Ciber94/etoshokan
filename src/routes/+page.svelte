<script>
	import { dictionary } from '$lib/dictionary';

	const dict = dictionary;
	let loading = $state(false);

	$effect(() => {
		async function run() {
			try {
				loading = true;
				console.log('Loading dictionary');
				await dict.initialize();
				console.log('Dictionary finished loader');
				loading = false;
			} catch (err) {
				if (err instanceof Error) {
					console.error(err.message);
				} else {
					console.error(err);
				}
			}
		}

		run();
	});
</script>

{#if loading}
	<h1>Loading dictionary...</h1>
{:else}
	<h1>Dictionary loaded</h1>
{/if}
