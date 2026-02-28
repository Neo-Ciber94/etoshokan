import { createQuery, queryOptions, useQueryClient } from '@tanstack/svelte-query';
import { getLocalBooksMetadata } from './books.query';

const booksMetadataQueryKey = ['books', 'metadata'] as const;

function booksMetadataQuery() {
	return queryOptions({
		queryKey: booksMetadataQueryKey,
		queryFn: getLocalBooksMetadata
	});
}

export function useBooksMetadata() {
	const query = createQuery(() => booksMetadataQuery());
	const queryClient = useQueryClient();

	return {
		get loading() {
			return query.isPending;
		},

		get value() {
			return query.data ?? [];
		},

		invalidate() {
			return queryClient.invalidateQueries({ queryKey: booksMetadataQueryKey });
		}
	};
}
