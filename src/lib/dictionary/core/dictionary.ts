export interface WordEntry {
	/**
	 * Id for this entry
	 */
	id: string;

	/** Original query term (normalized) */
	term: string;

	/** Common word */
	common: boolean;

	/** Optional reading / pronunciation (kana, IPA, etc.) */
	reading?: string;

	/** Language code of the term (ISO 639-1 or BCP 47) */
	language: string;

	/** Meanings / senses */
	senses: Sense[];
}

export interface Sense {
	/** Part of speech: noun, verb, adj, etc. */
	partOfSpeech?: PartOfSpeech;

	/** Usage notes, examples, tags */
	notes?: string[];
	examples?: Example[];
	glosses: Gloss[];

	/** Extra metadata (frequency, JLPT level, etc.) */
	meta?: Record<string, unknown>;
}

export interface Gloss {
	lang: string;
	gender?: string | null;
	type?: string | null;
	text: string;
}

export type PartOfSpeech =
	| 'noun'
	| 'verb'
	| 'adjective'
	| 'adverb'
	| 'pronoun'
	| 'particle'
	| 'conjunction'
	| 'interjection'
	| 'auxiliary'
	| 'prefix'
	| 'suffix'
	| 'expression';

export interface ExampleSentence {
	lang: string;
	text: string;
}

export interface Example {
	sentences: ExampleSentence[];
}

export type Language = 'en' | 'jp';

export type LookupResult = {
	found: boolean;
	entries: WordEntry[];
};

export type LookupOptions = {
	maxResults?: number;
};

export abstract class Dictionary {
	abstract readonly name: string;

	abstract initialize(): Promise<void>;
	abstract getById(wordId: string): Promise<WordEntry | null>;
	abstract lookup(term: string, options?: LookupOptions): Promise<LookupResult>;
	abstract clear(): Promise<void>;
}
