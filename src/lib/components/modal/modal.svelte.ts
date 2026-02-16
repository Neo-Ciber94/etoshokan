export type ModalType = 'info' | 'error' | 'warning' | 'loading' | 'success';

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

type PendingModalResolved = Omit<ModalOptions, 'type' | 'canClose'>;

export interface PendingModalOptions<T> {
	title?: string;
	description?: string;
	onSuccess?: (value: T) => PendingModalResolved;
	onError?: (error: unknown) => PendingModalResolved;
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
	readonly id: number;
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

function defaultModalAction(id: number): ModalAction {
	return {
		name: 'Close',
		onclick: () => closeModal(id)
	};
}

export function openModal(options: ModalOptions): ModalHandle {
	const id = NEXT_ID++;

	const modal: ModalState = {
		id,
		title: options.title,
		description: options.description ?? '',
		type: options.type ?? 'info',
		canClose: options.canClose ?? true,
		actions: options.actions ?? [defaultModalAction(id)]
	};

	modals.push(modal);

	return {
		id,
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

openModal.pending = pending;

async function pending<T>(promise: Promise<T>, options?: PendingModalOptions<T>) {
	const handle = openModal({
		title: options?.title ?? 'Loading',
		description: options?.description,
		type: 'loading',
		canClose: false
	});

	function pendingSuccess(): PendingModalResolved {
		return {
			title: 'Success',
			actions: [defaultModalAction(handle.id)]
		};
	}

	function pendingError(error: unknown): PendingModalResolved {
		return {
			title: 'Error',
			description: error instanceof Error ? error.message : 'Something went wrong',
			actions: [defaultModalAction(handle.id)]
		};
	}

	const { onSuccess = pendingSuccess, onError = pendingError } = options || {};

	try {
		const result = await promise;

		openModal({
			...onSuccess(result),
			canClose: true,
			type: 'success'
		});
	} catch (err) {
		openModal({
			...onError(err),
			canClose: true,
			type: 'error'
		});
	} finally {
		handle.close();
	}
}

export function closeModal(id: number) {
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
