import {
	Dictionary,
	type Language,
	type WordEntry,
	type Sense,
	type PartOfSpeech
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
}

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
	private loaded = false;

	async initialize(): Promise<void> {
		if (this.loaded) return;

		let data = (await ibkv.get(JM_DICT_KEY)) as JMDict_Root | undefined;

		if (!data) {
			data = await downloadJMDictJSON();
			try {
				await ibkv.set(JM_DICT_KEY, data);
			} catch (err) {
				console.error(err);
			}
		}

		const normalize = (s: string) => s.trim().normalize('NFC');

		const mapPos = (posArr?: string[]): PartOfSpeech | undefined => {
			if (!posArr || posArr.length === 0) return undefined;
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

		const makeSenses = (senses: JMDict_Sense[]): Sense[] =>
			senses.map((s) => {
				const glosses = s.gloss.filter((g) => g.lang === 'en').map((g) => g.text);
				const notes: string[] = [];
				if (s.info?.length) notes.push(...s.info);
				if (s.misc?.length) notes.push(...s.misc);

				return {
					partOfSpeech: mapPos(s.partOfSpeech),
					notes: notes.length ? notes : undefined,
					meta: {
						glosses,
						pos: s.partOfSpeech,
						appliesToKanji: s.appliesToKanji,
						appliesToKana: s.appliesToKana
					}
				};
			});

		for (const w of data.words) {
			const senses = makeSenses(w.sense);
			const canonicalReading = w.kana.length ? w.kana[0].text : undefined;

			const baseEntry: WordEntry = {
				term: w.kanji.length ? w.kanji[0].text : (w.kana[0]?.text ?? ''),
				reading: canonicalReading,
				language: 'jp',
				senses
			};

			const pushTo = (map: Map<string, WordEntry[]>, key: string, entry: WordEntry) => {
				const k = normalize(key);
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

		this.loaded = true;
	}

	async lookup(term: string, options?: { targetLanguage: Language }): Promise<WordEntry[]> {
		const lang = options?.targetLanguage || 'en';

		if (lang !== 'en') {
			throw new Error(
				`Unsupported language, dictionary only support '${this.supportedLanguage}' to 'en' translations`
			);
		}

		if (!this.loaded) {
			await this.initialize();
		}

		if (wanakana.isRomaji(term)) {
			term = wanakana.toHiragana(term);
		}

		const normalize = (s: string) => s.trim().normalize('NFC');
		const key = normalize(term);

		const fromKanji = this.kanjiMap.get(key) ?? [];
		const fromKana = this.kanaMap.get(key) ?? [];

		const seen = new Set<string>();
		const out: WordEntry[] = [];
		for (const e of [...fromKanji, ...fromKana]) {
			const id = `${e.term}||${e.reading ?? ''}`;
			if (!seen.has(id)) {
				seen.add(id);
				out.push(e);
			}
		}

		return out;
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
