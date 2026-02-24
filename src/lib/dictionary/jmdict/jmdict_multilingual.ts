import {
	Dictionary,
	type LookupOptions,
	type LookupResult,
	type WordEntry
} from '../core/dictionary';
import { JMDict_EngDictionary } from './jmdict_eng';
import { JMDict_SpaDictionary } from './jmdict_spa';

export class MultilingualDictionary extends Dictionary {
	readonly name: string = 'JMDict (eng and spa)';
	private engDict = new JMDict_EngDictionary();
	private spaDict = new JMDict_SpaDictionary();

	async initialize(): Promise<void> {
		await Promise.all([this.engDict.initialize(), this.spaDict.initialize()]);
	}

	async getById(wordId: string): Promise<WordEntry | null> {
		let entry: WordEntry | null = await this.engDict.getById(wordId);

		if (entry == null) {
			entry = await this.spaDict.getById(wordId);
		}

		return entry;
	}

	async lookup(term: string, options?: LookupOptions): Promise<LookupResult> {
		const { maxResults = 5 } = options || {};

		const entries: WordEntry[] = [];
		const [engResult, spaResult] = await Promise.all([
			this.engDict.lookup(term, { maxResults }),
			this.spaDict.lookup(term, { maxResults })
		]);

		entries.push(...engResult.entries);
		entries.push(...spaResult.entries);

		return {
			found: engResult && spaResult.found,
			entries
		};
	}

	async clear(): Promise<void> {
		await Promise.all([this.engDict.clear(), this.spaDict.clear()]);
	}
}
