import type { WordEntry } from '$lib/dictionary/core/dictionary';

const STORAGE_KEY = 'etoshokan:saved-words';

function load(): WordEntry[] {
	if (typeof localStorage === 'undefined') {
		return [];
	}
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as WordEntry[]) : [];
	} catch {
		return [];
	}
}

function persist(words: WordEntry[]): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

class WordsStorage {
	words = $state<WordEntry[]>(load());

	save(entry: WordEntry): void {
		if (this.isSaved(entry.term, entry.language)) {
			return;
		}
		this.words = [...this.words, entry];
		persist(this.words);
	}

	delete(term: string, language: string): void {
		this.words = this.words.filter((w) => !(w.term === term && w.language === language));
		persist(this.words);
	}

	isSaved(term: string, language: string): boolean {
		return this.words.some((w) => w.term === term && w.language === language);
	}
}

export const wordsStorage = new WordsStorage();
