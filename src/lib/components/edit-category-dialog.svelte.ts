class EditCategoryDialogState {
	open = $state(false);
	categoryName = $state('');

	show(name: string) {
		this.categoryName = name;
		this.open = true;
	}

	close() {
		this.open = false;
	}
}

export const editCategoryDialog = new EditCategoryDialogState();
