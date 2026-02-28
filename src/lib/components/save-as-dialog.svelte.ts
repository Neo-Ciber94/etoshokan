import type { WordEntry } from '$lib/dictionary/core/dictionary';
import { wordsStorage } from '$lib/data/words/words-storage.svelte';

class SaveAsDialogState {
	open = $state(false);
	entry = $state<WordEntry | null>(null);

	show(entry: WordEntry) {
		this.entry = entry;
		this.open = true;
	}

	close() {
		this.open = false;
		this.entry = null;
	}

	saveToCategory(category: string) {
		if (this.entry) {
			wordsStorage.save(this.entry, category);
		}
		this.close();
	}

	promptAddCategory() {
		const name = prompt('Category name:');

		if (!name?.trim()) {
			return;
		}
	}
}

export const saveAsDialog = new SaveAsDialogState();
