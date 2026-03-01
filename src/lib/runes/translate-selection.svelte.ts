import { useStorage } from './local-storage.svelte';

export const translateSelectionEnabled = useStorage('translate-selection-enabled', {
	defaultValue: true,
	storage: () => localStorage
});
