type JsonPrimitive = string | number | boolean | null;
type JsonArray = JsonValue[];
type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonPrimitive | JsonArray | JsonObject;

type Widen<T> = T extends boolean
	? boolean
	: T extends number
		? number
		: T extends string
			? string
			: T extends null
				? null
				: T;

interface UseStorageOptions<T extends JsonValue> {
	defaultValue: T;
	storage?: () => Storage;
}

export function useStorage<T extends JsonValue>(key: string, options: UseStorageOptions<T>) {
	const { defaultValue, storage = () => sessionStorage } = options;

	let value = $state(load());

	function load(): Widen<T> {
		if (typeof window === 'undefined') return defaultValue as Widen<T>;
		try {
			const raw = storage().getItem(key);
			return raw !== null ? JSON.parse(raw) : (defaultValue as Widen<T>);
		} catch {
			return defaultValue as Widen<T>;
		}
	}

	function save(v: Widen<T>) {
		try {
			storage().setItem(key, JSON.stringify(v));
		} catch {
			// ignore quota errors
		}
	}

	return {
		get value() {
			return value;
		},
		set value(v: Widen<T>) {
			value = v;
			save(v);
		}
	};
}
