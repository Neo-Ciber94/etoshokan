type QueryOptions<T> = {
	loader: () => Promise<T>;
	initialData: T;
};

export function createQuery<T>(options: QueryOptions<T>) {
	const { loader, initialData } = options;
	let loading = $state(true);
	let data = $state<T>(initialData);

	async function invalidate() {
		loading = true;

		try {
			const result = await loader();
			data = result;
		} catch (err) {
			console.error(err);
		} finally {
			loading = false;
		}
	}

	$effect.root(() => {
		invalidate();
	});

	return {
		invalidate,

		get loading() {
			return loading;
		},
		get data() {
			return data;
		}
	};
}
