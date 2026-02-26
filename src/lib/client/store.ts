type Listener<T> = (newValue: T) => void;

export function createStore<T>(initialValue: T) {
	let currentValue: T = initialValue;
	const listeners = new Set<Listener<T>>();

	function set(newValue: T) {
		currentValue = newValue;

		for (const listener of listeners) {
			listener(newValue);
		}
	}

	function update(updater: (prevValue: T) => T) {
		const newValue = updater(currentValue);
		set(newValue);
	}

	function subscribe(listener: Listener<T>) {
		listeners.add(listener);

		return () => {
			listeners.delete(listener);
		};
	}

	function getValue() {
		return currentValue;
	}

	return {
		set,
		update,
		subscribe,
		getValue
	};
}
