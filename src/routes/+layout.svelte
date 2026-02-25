<script lang="ts">
	import './layout.css';
	import { isTauri } from '$lib/utils/isWeb';

	let { children } = $props();

	$effect(() => {
		if (isTauri()) {
			return;
		}

		let unlisten: (() => void) | undefined;

		async function handleUrls(urls: string[]) {
			for (const urlStr of urls) {
				try {
					const url = new URL(urlStr);

					// {scheme}://auth/callback?token=<token>
					if (url.hostname === 'auth' && url.pathname === '/callback') {
						const token = url.searchParams.get('token');

						if (token) {
							window.location.href = `/api/auth/exchange-token?token=${encodeURIComponent(token)}`;
							return;
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
