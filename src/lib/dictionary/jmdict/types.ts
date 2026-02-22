export interface JMDict_Root {
    version: string;
    languages: string[];
    commonOnly: boolean;
    dictDate: string;
    dictRevisions: string[];
    tags: Record<string, string>;
    words: JMDict_Word[];
}

export interface JMDict_Word {
    id: string;
    kanji: JMDict_KanjiEntry[];
    kana: JMDict_KanaEntry[];
    sense: JMDict_Sense[];
}

export interface JMDict_KanjiEntry {
    text: string;
    common: boolean;
    tags: string[];
}

export interface JMDict_KanaEntry {
    text: string;
    common: boolean;
    tags: string[];
    appliesToKanji: string[];
}

export interface JMDict_Sense {
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

export interface JMDict_LanguageSource {
    lang: string;
    text?: string;
    partial?: boolean;
    wasei?: boolean;
}

export interface JMDict_Gloss {
    lang: string;
    gender: string | null;
    type: string | null;
    text: string;
}