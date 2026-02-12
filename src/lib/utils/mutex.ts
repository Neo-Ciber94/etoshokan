type Ref<T> = {
	value: T;
};

type MutexState = {
	promise: Promise<void>;
	resolve: () => void;
};

class MutexLock {
	#state: Ref<MutexState | null>;

	constructor(state: Ref<MutexState | null>) {
		this.#state = state;
	}

	unlock() {
		const state = this.#state.value;

		if (state == null) {
			return;
		}

		this.#state.value = null;
		state.resolve();
	}
}

export class Mutex {
	#state: Ref<MutexState | null> = { value: null };

	async lock() {
		const promise = this.#state.value?.promise;

		if (promise) {
			await promise;
		}

		const deferred = Promise.withResolvers<void>();

		this.#state.value = {
			promise: deferred.promise,
			resolve: deferred.resolve
		};

		return new MutexLock(this.#state);
	}

	async run(cb: () => Promise<void>) {
		const lock = await this.lock();

		try {
			await cb();
		} finally {
			lock.unlock();
		}
	}
}
