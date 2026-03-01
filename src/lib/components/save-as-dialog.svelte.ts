import type { WordEntry } from '$lib/dictionary/core/dictionary';

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

	promptAddCategory() {
		const name = prompt('Category name:');

		if (!name?.trim()) {
			return;
		}
	}
}

export const saveAsDialog = new SaveAsDialogState();
