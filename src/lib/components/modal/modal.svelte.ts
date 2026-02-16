export type ModalType = 'info' | 'error' | 'warning' | 'pending';

export interface ModalAction {
	name: string;
	onclick: () => void;
}

export interface ModalOptions {
	title: string;
	description?: string;
	type: ModalType;
	canClose?: boolean;
	actions?: ModalAction[];
}

export interface ModalState {
	id: number;
	title: string;
	description: string;
	type: ModalType;
	canClose: boolean;
	actions: ModalAction[];
}

export interface ModalHandle {
	close: () => void;
	update: (
		changes: Partial<Pick<ModalState, 'title' | 'description' | 'canClose' | 'type'>>
	) => void;
}

let NEXT_ID = 0;
const modals = $state<ModalState[]>([]);

export function getModals(): ModalState[] {
	return modals;
}

export function openModal(options: ModalOptions): ModalHandle {
	const id = NEXT_ID++;

	const defaultAction: ModalAction = {
		name: 'Close',
		onclick: () => closeModal(id)
	};

	const modal: ModalState = {
		id,
		title: options.title,
		description: options.description ?? '',
		type: options.type ?? 'info',
		canClose: options.canClose ?? true,
		actions: options.actions ?? [defaultAction]
	};

	modals.push(modal);

	return {
		close: () => closeModal(id),
		update: (changes) => {
			const index = modals.findIndex((m) => m.id === id);
			if (index === -1) {
				return;
			}
			if (changes.title !== undefined) {
				modals[index].title = changes.title;
			}
			if (changes.description !== undefined) {
				modals[index].description = changes.description;
			}
			if (changes.canClose !== undefined) {
				modals[index].canClose = changes.canClose;
			}
			if (changes.type !== undefined) {
				modals[index].type = changes.type;
			}
		}
	};
}

function closeModal(id: number) {
	const index = modals.findIndex((m) => m.id === id);
	if (index !== -1) {
		modals.splice(index, 1);
	}
}

export function closeTopModal() {
	if (modals.length === 0) {
		return;
	}
	const top = modals[modals.length - 1];
	if (top.canClose) {
		modals.pop();
	}
}
