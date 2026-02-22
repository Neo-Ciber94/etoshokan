import type { Dictionary } from './core/dictionary';
import { JMDict_EngDictionary } from './jmdict/jmdict_eng';

export const dictionary: Dictionary = new JMDict_EngDictionary();
