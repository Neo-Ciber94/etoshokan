export function arrayToMap<T, K>(array: T[], keySelector: (value: T) => K) {
	const result = new Map<K, T>();

	for (const item of array) {
		const key = keySelector(item);
		result.set(key, item);
	}

	return result;
}
