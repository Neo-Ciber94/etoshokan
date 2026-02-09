export interface WordEntry {
	/** Original query term (normalized) */
	term: string;

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

	/** Extra metadata (frequency, JLPT level, etc.) */
	meta?: Record<string, unknown>;
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

export interface Example {
	text: string;
	translation?: string;
}

export type Language = 'en' | 'jp';

type LookupOptions = {
	targetLanguage: Language;
};

export abstract class Dictionary {
	abstract readonly name: string;
	abstract readonly supportedLanguage: Language;

	abstract initialize(): Promise<void>;
	abstract lookup(term: string, options?: LookupOptions): Promise<WordEntry[]>;
	abstract clear(): Promise<void>;
}
