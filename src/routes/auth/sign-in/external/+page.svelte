<script lang="ts">
	import { authClient } from '$lib/client/auth-client';

	$effect.pre(() => {
		authClient.signIn.social({
			provider: 'google',
			callbackURL: '/auth/deeplink-handoff'
		});
	});
</script>

<svelte:head>
	<title>Sign In</title>
</svelte:head>
