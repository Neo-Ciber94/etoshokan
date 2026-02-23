import type { WordEntry } from '$lib/dictionary/core/dictionary';

export const DEFAULT_CATEGORY = '⭐ Common';

const STORAGE_KEY = 'etoshokan:saved-words';

export interface SavedCategory {
	category: string;
	words: WordEntry[];
}

function load(): SavedCategory[] {
	if (typeof localStorage === 'undefined') {
		return [{ category: DEFAULT_CATEGORY, words: [] }];
	}
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return [{ category: DEFAULT_CATEGORY, words: [] }];
		}
		const parsed = JSON.parse(raw);

		// Migrate old format: WordEntry[] -> SavedCategory[]
		if (Array.isArray(parsed) && parsed.length > 0 && 'term' in parsed[0]) {
			return [{ category: DEFAULT_CATEGORY, words: parsed as WordEntry[] }];
		}

		const categories = parsed as SavedCategory[];
		if (!categories.some((c) => c.category === DEFAULT_CATEGORY)) {
			categories.unshift({ category: DEFAULT_CATEGORY, words: [] });
		}
		return categories;
	} catch {
		return [{ category: DEFAULT_CATEGORY, words: [] }];
	}
}

function persist(categories: SavedCategory[]): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}

class WordsStorage {
	categories = $state<SavedCategory[]>(load());

	get categoryNames(): string[] {
		return this.categories.map((c) => c.category);
	}

	save(entry: WordEntry, category = DEFAULT_CATEGORY): void {
		const withoutEntry = this.categories.map((c) => ({
			...c,
			words: c.words.filter((w) => !(w.term === entry.term && w.language === entry.language))
		}));
		const idx = withoutEntry.findIndex((c) => c.category === category);
		if (idx >= 0) {
			const updated = [...withoutEntry];
			updated[idx] = { ...updated[idx], words: [...updated[idx].words, entry] };
			this.categories = updated;
		} else {
			this.categories = [...withoutEntry, { category, words: [entry] }];
		}
		persist(this.categories);
	}

	delete(term: string, language: string): void {
		this.categories = this.categories.map((c) => ({
			...c,
			words: c.words.filter((w) => !(w.term === term && w.language === language))
		}));
		persist(this.categories);
	}

	isSaved(term: string, language: string): boolean {
		return this.categories.some((c) =>
			c.words.some((w) => w.term === term && w.language === language)
		);
	}

	addCategory(name: string): void {
		if (this.categories.some((c) => c.category === name)) return;
		this.categories = [...this.categories, { category: name, words: [] }];
		persist(this.categories);
	}

	renameCategory(oldName: string, newName: string): void {
		if (oldName === newName) return;
		if (this.categories.some((c) => c.category === newName)) return;
		this.categories = this.categories.map((c) =>
			c.category === oldName ? { ...c, category: newName } : c
		);
		persist(this.categories);
	}

	deleteCategory(name: string): void {
		if (name === DEFAULT_CATEGORY) return;
		this.categories = this.categories.filter((c) => c.category !== name);
		persist(this.categories);
	}
}

export const wordsStorage = new WordsStorage();
