<script lang="ts">
	import './layout.css';
	import { isTauri } from '$lib/utils/isWeb';

	let { children } = $props();

	$effect(() => {
		if (!isTauri()) {
			return;
		}

		let unlisten: (() => void) | undefined;

		async function handleUrls(urls: string[]) {
			console.log('Deep-linking to: ', urls);

			for (const urlStr of urls) {
				try {
					const url = new URL(urlStr);

					// {scheme}://auth/callback?token=<token>
					if (url.hostname === 'auth' && url.pathname === '/callback') {
						const token = url.searchParams.get('token');

						if (sessionStorage.getItem('token-exchanged')) {
							return;
						}

						if (token) {
							// Send the token so the BE can set the cookies
							const response = await fetch('/api/auth/exchange-token', {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({ token })
							});

							if (!response.ok) {
								const text = await response.text();
								return alert(`Failed to exchange login token: ${response.status}: ${text}`);
							}

							// We need to set a flag otherwise we will be stuck on a loop,
							// because 'handleUrls' will be getting called with the 'token' until the app is reloaded
							sessionStorage.setItem('token-exchanged', '1');
							location.reload();
						} else {
							console.error('Handoff token not found');
						}
					}
				} catch (err) {
					console.error(err);
				}
			}
		}

		async function setup() {
			const { onOpenUrl, getCurrent } = await import('@tauri-apps/plugin-deep-link');

			const current = await getCurrent();
			if (current) {
				await handleUrls(current);
			}

			unlisten = await onOpenUrl(handleUrls);
		}

		setup();

		return () => {
			unlisten?.();
		};
	});
</script>

{@render children()}
