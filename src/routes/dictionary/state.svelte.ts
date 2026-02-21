import { dictionary } from '$lib/dictionary';
import type { WordEntry } from '$lib/dictionary/core/dictionary';
import { debounce } from '$lib/runes/debounce.svelte';

class DictionaryState {
	results = $state<WordEntry[]>([]);
	loading = $state(true);
	query = $state('');
	error = $state('');

	private isDictionaryReady = false;

	constructor() {
        this.#waitDictionary()
    }

	async #waitDictionary() {
		if (this.isDictionaryReady) {
			return;
		}

		this.loading = true;
		await dictionary.initialize();
		this.loading = false;
		this.isDictionaryReady = true;
	}

	search = debounce(300, async (term: string) => {
		await this.#waitDictionary();

		this.error = '';
		this.query = term;

		if (!term?.trim()) {
			this.results = [];
			return;
		}
		try {
			this.loading = true;
			const res = await dictionary.lookup(term.trim());
			this.results = res.entries;
		} catch (err) {
			console.error(err);
			this.error = err instanceof Error ? err.message : 'Failed to search word';
		} finally {
			this.loading = false;
		}
	});

	clear() {
		this.query = '';
		this.results = [];
		this.error = '';
	}
}

export const dictionaryState = new DictionaryState();
