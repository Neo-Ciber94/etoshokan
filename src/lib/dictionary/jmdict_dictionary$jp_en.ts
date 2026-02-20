import {
	Dictionary,
	type Language,
	type WordEntry,
	type Sense,
	type PartOfSpeech,
	type Gloss,
	type LookupResult,
	type Example
} from './core/dictionary';
import { BlobReader, ZipReader } from '@zip.js/zip.js';
import * as ibkv from 'idb-keyval';
import * as wanakana from 'wanakana';

interface JMDict_Root {
	version: string;
	languages: string[];
	commonOnly: boolean;
	dictDate: string;
	dictRevisions: string[];
	tags: Record<string, string>;
	words: JMDict_Word[];
}

interface JMDict_Word {
	id: string;
	kanji: JMDict_KanjiEntry[];
	kana: JMDict_KanaEntry[];
	sense: JMDict_Sense[];
}

interface JMDict_KanjiEntry {
	text: string;
	common: boolean;
	tags: string[];
}

interface JMDict_KanaEntry {
	text: string;
	common: boolean;
	tags: string[];
	appliesToKanji: string[];
}

interface JMDict_Sense {
	partOfSpeech: string[];
	appliesToKanji: string[];
	appliesToKana: string[];
	related: JMDict_RelatedTerm[];
	antonym: string[];
	field: string[];
	dialect: string[];
	misc: string[];
	info: string[];
	languageSource: JMDict_LanguageSource[];
	gloss: JMDict_Gloss[];
	examples?: JMDict_Example[];
}

type JMDict_Example = {
	text: string;
	sentences: JMDict_ExampleSentence[];
};

type JMDict_ExampleSentence = {
	lang: string;
	text: string;
};

type JMDict_RelatedTerm = [string];

interface JMDict_LanguageSource {
	lang: string;
	text?: string;
	partial?: boolean;
	wasei?: boolean;
}

interface JMDict_Gloss {
	lang: string;
	gender: string | null;
	type: string | null;
	text: string;
}

const JM_DICT_KEY = 'etoshokan:jm_dict_json';

export class JMDict_Dictionary extends Dictionary {
	readonly name: string = 'JMDict';
	readonly supportedLanguage: Language = 'jp';

	private kanaMap: Map<string, WordEntry[]> = new Map();
	private kanjiMap: Map<string, WordEntry[]> = new Map();

	private loadingPromise?: Promise<void> = undefined;
	private loaded = false;

	constructor() {
		super();
	}

	normalize = (s: string) => s.trim().normalize('NFKC');

	mapPos = (posArr?: string[]): PartOfSpeech | undefined => {
		if (!posArr || posArr.length === 0) {
			return undefined;
		}

		const p = posArr[0].toLowerCase();

		if (p.startsWith('n')) return 'noun';
		if (p.startsWith('v')) return 'verb';
		if (p.startsWith('adj')) return 'adjective';
		if (p.startsWith('adv')) return 'adverb';
		if (p.startsWith('pron')) return 'pronoun';
		if (p === 'prt' || p.includes('particle')) return 'particle';
		if (p === 'conj' || p.includes('conjunction')) return 'conjunction';
		if (p === 'int' || p.includes('interjection')) return 'interjection';
		if (p === 'aux') return 'auxiliary';
		if (p === 'pref') return 'prefix';
		if (p === 'suf') return 'suffix';
		if (p.includes('expression')) return 'expression';

		return undefined;
	};

	makeSenses = (senses: JMDict_Sense[]): Sense[] =>
		senses.map((s) => {
			const glosses: Gloss[] = s.gloss.map((g) => ({
				lang: g.lang as Language,
				text: g.text,
				gender: g.gender,
				type: g.type
			}));

			const notes: string[] = [];
			const examples: Example[] = [];

			if (s.info?.length) {
				notes.push(...s.info);
			}
			if (s.misc?.length) {
				notes.push(...s.misc);
			}

			if (s.examples) {
				for (const example of s.examples) {
					examples.push({
						sentences: example.sentences
					});
				}
			}

			return {
				partOfSpeech: this.mapPos(s.partOfSpeech),
				notes: notes.length ? notes : undefined,
				glosses,
				examples,
				meta: {
					pos: s.partOfSpeech,
					appliesToKanji: s.appliesToKanji,
					appliesToKana: s.appliesToKana
				}
			};
		});

	async loadDictionary() {
		if (this.loaded) {
			return;
		}

		let data = (await ibkv.get(JM_DICT_KEY)) as JMDict_Root | undefined;

		if (!data) {
			console.log('fetch JSON');
			data = await downloadJMDictJSON();
			try {
				await ibkv.set(JM_DICT_KEY, data);
			} catch (err) {
				console.error(err);
			}
		}

		console.log('Loading dictionary');
		for (const w of data.words) {
			const senses = this.makeSenses(w.sense);
			const canonicalReading = w.kana.length ? w.kana[0].text : undefined;
			const isCommon = w.kana.some((x) => x.common) || w.kanji.some((w) => w.common);

			const baseEntry: WordEntry = {
				term: w.kanji.length ? w.kanji[0].text : (w.kana[0]?.text ?? ''),
				reading: canonicalReading,
				language: 'jp',
				senses,
				common: isCommon
			};

			const pushTo = (map: Map<string, WordEntry[]>, key: string, entry: WordEntry) => {
				const k = this.normalize(key);
				const arr = map.get(k) || [];
				arr.push(entry);
				map.set(k, arr);
			};

			for (const k of w.kanji) {
				const entry = { ...baseEntry, term: k.text };
				pushTo(this.kanjiMap, k.text, entry);
			}

			for (const k of w.kana) {
				const entry = { ...baseEntry, term: k.text, reading: k.text }; // keep kana reading
				pushTo(this.kanaMap, k.text, entry);
			}
		}

		console.log('Dictionary finished loading');
		this.loaded = true;
	}

	async initialize(): Promise<void> {
		if (this.loadingPromise == null) {
			this.loadingPromise = this.loadDictionary();
		}

		await this.loadingPromise;
	}

	searchKana(term: string) {
		const fromKanji = this.kanjiMap.get(term) ?? [];
		const fromKana = this.kanaMap.get(term) ?? [];
		return [...fromKanji, ...fromKana];
	}

	searchEnglish(term: string, maxCount: number): WordEntry[] {
		const results: WordEntry[] = [];

		// const push = (word: WordEntry) => {
		// 	if (results.length >= maxCount) {
		// 		return false;
		// 	}

		// 	results.push(word);
		// 	return true;
		// };

		const scoreWord = (word: WordEntry, normalized: string): number => {
			let score = 0;

			if (word.common) {
				score += 30;
			}

			if (word.reading) {
				score += 10;

				if (word.reading.length < 3) {
					score += 40;
				}
			}

			for (const sense of word.senses) {
				for (const gloss of sense.glosses) {
					const text = gloss.text.toLowerCase();

					if (text === normalized) {
						score += 100;
					} else if (text.startsWith(normalized)) {
						score += 80;
					} else if (text.includes(` ${normalized}`) || text.includes(`${normalized} `)) {
						score += 60;
					} else if (text.includes(normalized)) {
						score += 30;
					}

					// Shorter the better
					if (text.length <= 20) {
						score += 10;
					}
				}

				// Penalize for many glosses
				if (sense.glosses.length > 2) {
					score /= sense.glosses.length;
				}
			}

			// Penalize for too many senses
			score /= word.senses.length;

			// crude but effective: first sense bias
			//score += word.senses.length > 0 ? 10 : 0;

			return score;
		};

		const scores = new Map<WordEntry, number>();

		const scan = (searchTerm: string, map: Map<string, WordEntry[]>) => {
			const normalizedTerm = searchTerm.toLowerCase();

			for (const words of map.values()) {
				for (const word of words) {
					// const glosses = word.senses.flatMap((w) => w.glosses);
					// const matches = glosses.some((x) => x.text.toLowerCase().includes(normalizedTerm));
					// if (!matches) {
					// 	continue;
					// }
					// if (!push(word)) {
					// 	return;
					// }

					if (scores.has(word)) {
						continue;
					}

					const score = scoreWord(word, normalizedTerm);
					if (score > 0) {
						scores.set(word, score);
					}
				}
			}
		};

		const kanjiMap = this.kanjiMap;
		const kanaMap = this.kanaMap;

		// Try word match
		scan(term, kanaMap);
		scan(term, kanjiMap);

		// return results;
		return [...scores.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, maxCount)
			.map(([word]) => word);
	}

	searchContainsKana(term: string, maxCount: number): WordEntry[] {
		const results: WordEntry[] = [];
		const seen = new Set<string>();

		const scan = (map: Map<string, WordEntry[]>) => {
			if (results.length >= maxCount) {
				return;
			}

			// We search substrings of the search term
			for (let i = 1; i < term.length; i++) {
				const parts = splitAt(term, i);

				for (const part of parts) {
					for (const [k, entries] of map) {
						if (!k.startsWith(part)) {
							continue;
						}

						for (const e of entries) {
							const id = `${e.term}||${e.reading ?? ''}`;
							if (seen.has(id)) {
								continue;
							}

							seen.add(id);
							results.push(e);

							if (results.length >= maxCount) {
								return;
							}
						}
					}
				}
			}
		};

		scan(this.kanjiMap);
		scan(this.kanaMap);
		return results;
	}

	fallbackSearch(term: string, maxCount: number): WordEntry[] {
		const results: WordEntry[] = [];

		if (wanakana.isJapanese(term)) {
			const otherResults = this.searchContainsKana(term, maxCount);
			results.push(...otherResults);
		} else {
			// Search english matches
			const englishResults = this.searchEnglish(term, 100); // 10
			results.push(...englishResults);

			// Try convert to kana and search
			// const kanaTerm = wanakana.toKana(term);
			// const kanaResults = this.searchKana(kanaTerm);
			// results.push(...kanaResults);
		}

		return results;
	}

	async lookup(term: string, options?: { targetLanguage: Language }): Promise<LookupResult> {
		const lang = options?.targetLanguage || 'en';

		if (lang !== 'en') {
			throw new Error(
				`Unsupported language, dictionary only support '${this.supportedLanguage}' to 'en' translations`
			);
		}

		if (!this.loaded) {
			await this.initialize();
		}

		term = this.normalize(term.trim());

		if (term.length == 0) {
			return {
				found: false,
				entries: []
			};
		}

		let found = true;
		const results = this.searchKana(term);
		const fallback: WordEntry[] = [];

		if (results.length === 0) {
			fallback.push(...this.fallbackSearch(term, 10));
			found = false;
		}

		console.log({
			found,
			term,
			results,
			fallback,
			isJapanese: wanakana.isJapanese(term)
		});

		const seen = new Set<string>();
		const entries: WordEntry[] = [];

		for (const e of [...results, ...fallback]) {
			const id = `${e.term}||${e.reading ?? ''}`;
			if (!seen.has(id)) {
				seen.add(id);
				entries.push(e);
			}
		}

		return { found, entries };
	}

	async clear() {
		await ibkv.del(JM_DICT_KEY);
		return Promise.resolve();
	}
}

const JMDICT_JSON_URL = '/jmdict-eng-3.6.2+20260202123847.json.zip';

async function downloadJMDictJSON() {
	const response = await fetch(JMDICT_JSON_URL);
	const buffer = await response.arrayBuffer();
	const blob = new Blob([buffer]);

	const zipFileReader = new BlobReader(blob);
	const transformStream = new TransformStream();
	const textPromise = new Response(transformStream.readable).text();

	const zipReader = new ZipReader(zipFileReader);
	const zipEntries = await zipReader.getEntries();
	const firstEntry = zipEntries.shift()!;

	if (!('getData' in firstEntry)) {
		throw new Error('Invalid zip entry');
	}

	await firstEntry.getData(transformStream.writable);
	await zipReader.close();

	const jsonText = await textPromise;
	const json = JSON.parse(jsonText);
	return json as JMDict_Root;
}

function splitAt(s: string, index: number): string[] {
	return [s.slice(0, index), s.slice(index + 1)];
}

type Sortable = string | number | Date | boolean;

function sortBy<T>(items: T[], keySelector: (value: T) => Sortable): T[] {
	return [...items].sort((a, b) => {
		const ka = keySelector(a);
		const kb = keySelector(b);

		if (ka instanceof Date && kb instanceof Date) {
			return ka.getTime() - kb.getTime();
		}

		if (typeof ka === 'boolean' && typeof kb === 'boolean') {
			return Number(ka) - Number(kb);
		}

		if (typeof ka === 'number' && typeof kb === 'number') {
			return ka - kb;
		}

		if (typeof ka === 'string' && typeof kb === 'string') {
			return ka.localeCompare(kb);
		}

		// fallback for mixed types (shouldn't really happen)
		return String(ka).localeCompare(String(kb));
	});
}
