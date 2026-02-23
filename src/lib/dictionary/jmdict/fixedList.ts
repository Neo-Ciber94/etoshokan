export class FixedList<T> {
	private items: T[] = [];

	constructor(readonly maxSize: number) {
		if (maxSize < 0) {
			throw new Error('FixedList maxSize should be positive');
		}
	}

	get length(): number {
		return this.items.length;
	}

	get isFull(): boolean {
		return this.items.length >= this.maxSize;
	}

	get isEmpty(): boolean {
		return this.items.length === 0;
	}

	at(index: number): T | undefined {
		return this.items[index];
	}

	push(...items: T[]): boolean {
		if (this.isFull) {
			return false;
		}

		for (const item of items) {
			if (this.isFull) {
				break;
			}

			this.items.push(item);
		}
		return true;
	}

	pop(): T | undefined {
		return this.items.pop();
	}

	clear(): void {
		this.items.length = 0;
	}

	toArray(): T[] {
		return [...this.items];
	}

	[Symbol.iterator](): Iterator<T> {
		return this.items[Symbol.iterator]();
	}
}
