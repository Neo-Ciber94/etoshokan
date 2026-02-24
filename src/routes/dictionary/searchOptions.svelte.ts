export type SearchLanguage = 'all' | 'en' | 'es';

class SearchOptions {
	language = $state<SearchLanguage>('all');
	maxResults = $state(5);
}

export const searchOptions = new SearchOptions();
