<script lang="ts">
	import { getMessageChannel } from '$lib/common/message-channel';

	$effect(() => {
		getMessageChannel().send({ event: 'reload-page' });
	});
</script>

<div class="flex h-[min(80vh,400px)] w-full flex-col items-center justify-center">
	<h1 class="text-2xl text-accent-foreground">Successfully logged in, you can close this tab</h1>
</div>
