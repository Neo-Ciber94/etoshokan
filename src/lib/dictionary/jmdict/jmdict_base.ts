import {
	Dictionary,
	type WordEntry,
	type LookupResult,
	type LookupOptions
} from '../core/dictionary';
import * as ibkv from 'idb-keyval';
import * as wanakana from 'wanakana';
import { FixedList } from './fixedList';
import { getJmdictData } from './utils';

const SHORT_WORD_LENGTH = 3;

export type JMDictOptions = {
	jmdictUrl: string;
	cacheKey: string;
	lang: string;
};

export abstract class JMDictBase extends Dictionary {
	private wordsIndex = new Map<string, WordEntry>();
	private kanaMap = new Map<string, WordEntry[]>();
	private kanjiMap = new Map<string, WordEntry[]>();

	private loadingPromise?: Promise<void> = undefined;
	private loaded = false;

	constructor(readonly options: JMDictOptions) {
		super();
	}

	async loadDictionary() {
		if (this.loaded) {
			return;
		}

		console.log(`Loading jmdict: ${this.name}`);

		try {
			const { kanaMap, kanjiMap, wordsIndex } = await getJmdictData(this.options);
			this.kanaMap = kanaMap;
			this.kanjiMap = kanjiMap;
			this.wordsIndex = wordsIndex;

			console.log(`Jmdict dictionary was loaded: '${this.name}'`);
		} catch (err) {
			console.error(`Failed to load dictionary for '${this.name}'`, err);
		}
		this.loaded = true;
	}

	async getById(wordId: string) {
		await this.initialize();
		return this.wordsIndex.get(wordId) ?? null;
	}

	async clear() {
		await ibkv.del(this.options.cacheKey);
		return Promise.resolve();
	}

	async initialize(): Promise<void> {
		if (this.loadingPromise == null) {
			this.loadingPromise = this.loadDictionary();
		}

		await this.loadingPromise;
	}

	searchShortWord(term: string, results: FixedList<WordEntry>) {
		if (term.length > SHORT_WORD_LENGTH) {
			return;
		}

		const hira = wanakana.toHiragana(term);
		const kana = wanakana.toKatakana(term);
		const temp = new FixedList<WordEntry>(results.maxSize);
		this.searchJapanese(hira, temp);
		this.searchJapanese(kana, temp);

		// shorter and common first
		const shortWords = temp
			.toArray()
			.sort((a, b) => {
				const aLen = a.reading?.length ?? Number.POSITIVE_INFINITY;
				const bLen = b.reading?.length ?? Number.POSITIVE_INFINITY;
				return aLen - bLen;
			})
			.sort((a, b) => {
				if (a.common === b.common) {
					return 0;
				}
				return a.common ? -1 : 1;
			});

		results.push(...shortWords);
	}

	searchOnForeignLanguage(term: string, results: FixedList<WordEntry>) {
		const entries = new Map<WordEntry, number>();
		const normalized = term.toLowerCase();

		const getWordScore = (word: WordEntry): number => {
			let totalScore = 0;
			let unrelatedCount = 0;

			if (word.common) {
				totalScore += 50;
			}

			for (const sense of word.senses) {
				let bestSenseScore = -Infinity;

				for (const gloss of sense.glosses) {
					const text = gloss.text.trim().toLowerCase();
					let score = 0;

					if (text === normalized) {
						score = 100;
					} else if (text.startsWith(`${normalized} `) || text.endsWith(` ${normalized}`)) {
						score = 85;
					} else if (text.includes(` ${normalized} `)) {
						score = 80;
					} else if (text.includes(normalized)) {
						score = 50;
					} else {
						unrelatedCount += 1;
					}

					if (score > bestSenseScore) {
						bestSenseScore = score;
					}
				}

				if (bestSenseScore > 0) {
					totalScore += bestSenseScore;
				}
			}

			// Reward for few unrelated glosses
			const maxUnrelatedBonus = 200;
			totalScore += Math.max(0, maxUnrelatedBonus - unrelatedCount * 20);

			// Reward for fewer senses
			const maxSensesBonus = 200;
			totalScore += Math.max(0, maxSensesBonus - word.senses.length * 50);

			// // Penalize for unrelated matches
			// totalScore -= unrelatedCount * 20;

			// // Penalize for many senses
			// totalScore -= word.senses.length * 50;

			return totalScore;
		};

		const scan = (map: Map<string, WordEntry[]>) => {
			for (const words of map.values()) {
				for (const word of words) {
					if (entries.has(word)) {
						continue;
					}

					const score = getWordScore(word);

					if (score > 0) {
						entries.set(word, score);
					}
				}
			}
		};

		if (term.length <= SHORT_WORD_LENGTH) {
			this.searchShortWord(term, results);
		}

		scan(this.kanjiMap);
		scan(this.kanaMap);
		const values = [...entries]
			.sort((a, b) => b[1] - a[1])
			.map(([word]) => word)
			.slice(0, results.maxSize);

		results.push(...values);
	}

	searchContainsKana(term: string, results: FixedList<WordEntry>) {
		const seen = new Set<string>();

		const scan = (map: Map<string, WordEntry[]>) => {
			// if (results.length >= maxCount) {
			// 	return;
			// }

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

							// if (results.length >= maxCount) {
							// 	return;
							// }
						}
					}
				}
			}
		};

		scan(this.kanjiMap);
		scan(this.kanaMap);
	}

	searchJapanese(term: string, results: FixedList<WordEntry>) {
		const fromKanji = this.kanjiMap.get(term) ?? [];
		const fromKana = this.kanaMap.get(term) ?? [];
		const values: WordEntry[] = [...fromKanji, ...fromKana];
		results.push(...values);
	}

	search(term: string, isJapanese: boolean, results: FixedList<WordEntry>) {
		if (isJapanese) {
			this.searchJapanese(term, results);
		} else {
			this.searchOnForeignLanguage(term, results);
		}
	}

	async lookup(term: string, options?: LookupOptions): Promise<LookupResult> {
		const baseLang = this.options.lang;
		const { maxResults = 100, lang = baseLang } = options || {};

		if (lang != baseLang) {
			return {
				entries: [],
				found: false
			};
		}

		if (!this.loaded) {
			await this.initialize();
		}

		term = normalize(term.trim());

		if (term.length == 0) {
			return {
				found: false,
				entries: []
			};
		}

		let found = true;
		const results = new FixedList<WordEntry>(maxResults);
		const isJapanese = wanakana.isJapanese(term);
		this.search(term, isJapanese, results);

		if (results.length === 0) {
			found = false;

			if (isJapanese) {
				this.searchContainsKana(term, results);
			} else {
				const hira = wanakana.toHiragana(term);
				const kata = wanakana.toKatakana(term);
				console.log(`searching ${this.name}`, { hira, kata });
				this.search(hira, true, results);
				this.search(kata, true, results);
			}
		}

		console.log({ term, found, isJapanese, results });

		const entries = deduplicate(results.toArray());
		return { found, entries };
	}
}

function deduplicate(items: WordEntry[]) {
	const seen = new Set<string>();
	const entries: WordEntry[] = [];

	for (const e of items) {
		const id = `${e.term}||${e.reading ?? ''}`;
		if (!seen.has(id)) {
			seen.add(id);
			entries.push(e);
		}
	}

	return entries;
}

function normalize(s: string) {
	return s.trim().normalize('NFKC');
}

function splitAt(s: string, index: number): string[] {
	return [s.slice(0, index), s.slice(index + 1)];
}
