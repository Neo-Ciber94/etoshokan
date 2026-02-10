// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => void;

export function debounce<F extends AnyFunction>(durationMs: number | (() => number), f: F) {
	let timeout: number = 0;

	const debouncedFunction = (...args: Parameters<F>) => {
		if (timeout) {
			window.clearTimeout(timeout);
		}

		const ms = typeof durationMs === 'function' ? durationMs() : durationMs;
		timeout = window.setTimeout(() => f(...args), ms);
	};

	return debouncedFunction as F;
}
