import { BlobReader, ZipReader } from '@zip.js/zip.js';
import type { JMDict_Root, JMDict_Sense } from './types';
import { hashBase64 } from '$lib/utils/hash';
import type { WordEntry, PartOfSpeech, Sense, Gloss, Language, Example } from '../core/dictionary';
import * as ibkv from 'idb-keyval';

type JmdictDataOptions = {
	jmdictUrl: string;
	cacheKey: string;
	lang: string;
};

export async function getJmdictData(options: JmdictDataOptions) {
	const { cacheKey, jmdictUrl, lang } = options;
	const kanjiMap = new Map<string, WordEntry[]>();
	const kanaMap = new Map<string, WordEntry[]>();
	const wordsIndex = new Map<string, WordEntry>();

	let data = (await ibkv.get(cacheKey)) as JMDict_Root | undefined;

	if (!data) {
		console.log(`Downloading JMDict data: ${jmdictUrl}`);
		data = await downloadJMDictJSON(jmdictUrl);

		try {
			await ibkv.set(cacheKey, data);
		} catch (err) {
			console.error(err);
		}
	}

	const pushTo = (map: Map<string, WordEntry[]>, key: string, entry: WordEntry) => {
		const k = normalize(key);
		const arr = map.get(k) || [];
		arr.push(entry);
		map.set(k, arr);
	};

	for (const w of data.words) {
		const senses = mapSenses(w.sense);
		const term = w.kanji.length ? w.kanji[0].text : (w.kana[0]?.text ?? '');
		const canonicalReading = w.kana[0]?.text ?? w.kanji[0]?.text ?? '';

		for (const k of w.kanji) {
			const id = computeId(lang, w.id, k.text);
			const entry: WordEntry = {
				id,
				term,
				common: k.common,
				language: lang,
				senses: senses,
				reading: canonicalReading
			};
			pushTo(kanjiMap, k.text, entry);
			wordsIndex.set(id, entry);
		}

		for (const k of w.kana) {
			const id = computeId(lang, w.id, k.text);
			const entry: WordEntry = {
				id,
				term,
				common: k.common,
				language: lang,
				senses: senses,
				reading: canonicalReading
			};
			pushTo(kanaMap, k.text, entry);
			wordsIndex.set(id, entry);
		}
	}

	return { kanjiMap, kanaMap, wordsIndex };
}

function computeId(lang: string, jmdictId: string, text: string) {
	return hashBase64([lang, jmdictId, text]);
}

function mapPartOfSpeech(posArr?: string[]): PartOfSpeech | undefined {
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
}

function mapSenses(senses: JMDict_Sense[]): Sense[] {
	return senses.map((s) => {
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
			partOfSpeech: mapPartOfSpeech(s.partOfSpeech),
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
}

function normalize(s: string) {
	return s.trim().normalize('NFKC');
}

async function downloadJMDictJSON(url: string) {
	const response = await fetch(url);
	const buffer = await response.arrayBuffer();
	const text = await unzipAsText(buffer);
	const json = JSON.parse(text);
	return json as JMDict_Root;
}

async function unzipAsText(data: ArrayBuffer) {
	const blob = new Blob([data]);

	const zipFileReader = new BlobReader(blob);
	const transformStream = new TransformStream();
	const textPromise = new Response(transformStream.readable).text();

	const zipReader = new ZipReader(zipFileReader);
	const zipEntries = await zipReader.getEntries();
	const firstEntry = zipEntries.shift()!;

	if (!('getData' in firstEntry)) {
		throw new Error('Expected zip with single entry');
	}

	await firstEntry.getData(transformStream.writable);
	await zipReader.close();

	return await textPromise;
}
