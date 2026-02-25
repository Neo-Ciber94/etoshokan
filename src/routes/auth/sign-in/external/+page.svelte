<script lang="ts">
	import { authClient } from '$lib/client/auth-client';

	$effect.pre(() => {
		async function run() {
			await authClient.signIn.social({
				provider: 'google',
				callbackURL: '/api/auth/deeplink-handoff'
			});
		}

		run();
	});
</script>

<svelte:head>
	<title>Sign In</title>
</svelte:head>
