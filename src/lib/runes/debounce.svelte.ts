// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => void;

export function debounce<F extends AnyFunction>(durationMs: number, f: F) {
	let timeout: number = 0;

	const debouncedFunction = (...args: Parameters<F>) => {
		if (timeout) {
			window.clearTimeout(timeout);
		}

		timeout = window.setTimeout(() => f(...args), durationMs);
	};

	return debouncedFunction as F;
}
