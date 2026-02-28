<script lang="ts">
	import { isTauri } from '$lib/utils/isWeb';

	async function hashToken(token: string): Promise<string> {
		const data = new TextEncoder().encode(token);
		const hash = await crypto.subtle.digest('SHA-256', data);
		const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
		return base64;
	}

	async function handleUrls(urls: string[]) {
		console.log('Deep-linking to: ', urls);

		for (const urlStr of urls) {
			try {
				const url = new URL(urlStr);

				// {scheme}://auth/callback?token=<token>
				if (url.hostname === 'auth' && url.pathname === '/callback') {
					const token = url.searchParams.get('token');

					if (token) {
						// Prevent re-exchange of the same token — getCurrent() keeps returning
						// the launch URL on every reload, so we scope the flag to a hash of the token
						const hash = await hashToken(token);
						const key = `token-exchanged-${hash}`;

						if (sessionStorage.getItem(key)) {
							return;
						}

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

						sessionStorage.setItem(key, '1');
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

	$effect(() => {
		if (!isTauri()) {
			return;
		}

		let unlisten: (() => void) | undefined;

		async function handleAuthDeepLinking() {
			const { onOpenUrl, getCurrent } = await import('@tauri-apps/plugin-deep-link');

			const current = await getCurrent();
			if (current) {
				await handleUrls(current);
			}

			unlisten = await onOpenUrl(handleUrls);
		}

		handleAuthDeepLinking();

		return () => {
			unlisten?.();
		};
	});
</script>
