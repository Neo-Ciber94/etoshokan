export function useLocalStorage<T>(key: string, defaultValue: T) {
	let value = $state(load());

	function load(): T {
		if (typeof window === 'undefined') return defaultValue;
		try {
			const raw = localStorage.getItem(key);
			return raw !== null ? JSON.parse(raw) : defaultValue;
		} catch {
			return defaultValue;
		}
	}

	function save(v: T) {
		try {
			localStorage.setItem(key, JSON.stringify(v));
		} catch {
			// ignore quota errors
		}
	}

	return {
		get value() {
			return value;
		},
		set value(v: T) {
			value = v;
			save(v);
		}
	};
}
