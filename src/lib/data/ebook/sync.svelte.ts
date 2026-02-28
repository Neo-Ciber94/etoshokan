import { createQuery, queryOptions, useQueryClient } from '@tanstack/svelte-query';
import { initSyncData } from './sync.mutation';

const syncEntriesQueryKey = ['books', 'sync'] as const;

function syncEntriesQuery() {
	return queryOptions({
		queryKey: syncEntriesQueryKey,
		queryFn: initSyncData
	});
}

export function useSyncBookEntries() {
	const query = createQuery(() => syncEntriesQuery());
	const queryClient = useQueryClient();

	return {
		get loading() {
			return query.isPending;
		},

		get value() {
			return query.data ?? [];
		},

		invalidate() {
			return queryClient.invalidateQueries({ queryKey: syncEntriesQueryKey });
		}
	};
}
