<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { getCookie, setCookie } from '$lib/utils/cookies';

	const COOKIE_PWA_REMINDER = "etoshokan.pwa-install-reminder"
	const COOKIE_PWA_REMINDER_MS = 1000 * 60 * 24; // 1 day

	let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
	let show = $state(false);

	interface BeforeInstallPromptEvent extends Event {
		prompt(): Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	}

	$effect.pre(() => {
		if (getCookie(COOKIE_PWA_REMINDER)) {
			return;
		}

		const handler = (e: Event) => {
			e.preventDefault();
			deferredPrompt = e as BeforeInstallPromptEvent;
			show = true;
		};

		window.addEventListener('beforeinstallprompt', handler);
		return () => window.removeEventListener('beforeinstallprompt', handler);
	});

	async function install() {
		if (!deferredPrompt) {
			return;
		}

		await deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;

		if (outcome === 'accepted') {
			deferredPrompt = null;
			show = false;
		}
	}

	function dismiss() {
		show = false;
		deferredPrompt = null;
		setCookie(COOKIE_PWA_REMINDER, "1", COOKIE_PWA_REMINDER_MS)
	}
</script>

{#if show}
	<div
		class="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 md:bottom-4"
	>
		<div class="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-lg">
			<div class="flex-1">
				<p class="text-sm font-medium text-foreground">Install Etoshokan</p>
				<p class="text-xs text-muted-foreground">Add to your home screen for quick access</p>
			</div>
			<div class="flex shrink-0 gap-2">
				<Button variant="ghost" size="sm" onclick={dismiss}>Dismiss</Button>
				<Button size="sm" onclick={install}>Install</Button>
			</div>
		</div>
	</div>
{/if}
