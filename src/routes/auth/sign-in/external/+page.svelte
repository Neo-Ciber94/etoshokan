<script lang="ts">
	import { authClient } from '$lib/auth-client';

	$effect.pre(() => {
		async function run() {
			await authClient.signIn.social({
				provider: 'google',
				callbackURL: '/auth/success'
			});
		}

		run();
	});
</script>

<svelte:head>
	<title>Sign In</title>
</svelte:head>
