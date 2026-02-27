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

	async run(cb: () => Promise<void>) {
		const lock = await this.lock();

		try {
			await cb();
		} finally {
			lock.unlock();
		}
	}
}
