import { JMDictBase } from './jmdict_base';

export class JMDict_EngDictionary extends JMDictBase {
	readonly name: string = 'JMDict (eng)';

	constructor() {
		super({
			jmdictUrl: '/jmdict/jmdict-examples-eng-3.6.2+20260223124729.json.zip',
			cacheKey: 'jmdict-eng',
			lang: 'en'
		});
	}
}
