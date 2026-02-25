<script lang="ts">
	import { authClient, clientAuthSignIn } from '$lib/auth-client';
	import { isTauri } from '$lib/utils/isWeb';
	import { open_chrome } from 'tauri-plugin-in-app-browser-api';

	$effect.pre(() => {
		async function run() {
			if (isTauri()) {
				const result = await clientAuthSignIn({
					provider: 'google',
					callbackURL: '/api/auth/deeplink-handoff'
				});

				if (!result.success) {
					alert(`Failed to login: ${result.error}`);
					return;
				}

				// TODO: `clientAuthSignIn` can return `redirect: false`

				try {
					await open_chrome({
						url: result.data.url
					});
				} catch (err) {
					console.error('Failed to open chrome: ', err);
				}
			} else {
				await authClient.signIn.social({
					provider: 'google'
				});
			}
		}

		run();
	});
</script>

<svelte:head>
	<title>Sign In</title>
</svelte:head>
