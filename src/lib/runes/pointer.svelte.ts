export function usePointer() {
	let x = $state(0);
	let y = $state(0);

	$effect(() => {
		const handler = (e: PointerEvent) => {
			x = e.clientX;
			y = e.clientY;
		};

		window.addEventListener('pointermove', handler);
		return () => window.removeEventListener('pointermove', handler);
	});

	return {
		get x() { return x; },
		get y() { return y; },
		update(newX: number, newY: number) {
			x = newX;
			y = newY;
		}
	};
}
