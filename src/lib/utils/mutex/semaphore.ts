type SemaphoreLock = {
	release: () => void;
};

type Waiting = (lock: SemaphoreLock) => void;

export class Semaphore {
	#waiting: Waiting[] = [];
	#permits: number = 0;

	constructor(maxPermits: number) {
		if (maxPermits <= 0) {
			throw new Error(`maxPermits should be greater than 0`);
		}

		this.#permits = maxPermits;
	}

	async acquire(): Promise<SemaphoreLock> {
		if (this.#permits <= 0) {
			const waiting = this.#waiting;

			return new Promise<SemaphoreLock>((resolve) => {
				waiting.push(resolve);
			});
		}

		return this.acquireNextLock();
	}

	async run<T>(f: () => Promise<T>) {
		const lock = await this.acquire();

		try {
			const result = await f();
			return result;
		} finally {
			lock.release();
		}
	}

	private acquireNextLock() {
		let released = false;
		this.#permits -= 1;

		const release = () => {
			if (released) {
				console.warn('lock was already released');
				return;
			}

			released = true;
			this.#permits += 1;

			const resolveNext = this.#waiting.shift();

			if (resolveNext) {
				const lock = this.acquireNextLock();
				resolveNext(lock);
			}
		};

		return { release };
	}
}
