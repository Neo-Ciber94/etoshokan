import { Semaphore } from './semaphore';

export class Mutex {
	#semaphore = new Semaphore(1);

	async lock() {
		const lock = await this.#semaphore.acquire();

		return {
			unlock() {
				lock.release();
			}
		};
	}

	async run<T>(cb: () => Promise<T>) {
		const lock = await this.lock();

		try {
			const result = await cb();
			return result;
		} finally {
			lock.unlock();
		}
	}
}
