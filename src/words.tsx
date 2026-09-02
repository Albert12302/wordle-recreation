import wordList from "../src/assets/five-letter-words.json";

const WORD_LIST: readonly string[] = wordList;
const WORD_SET = new Set(WORD_LIST.map((w) => w.toLowerCase()));

export function isValidWord(word: string): boolean {
  return WORD_SET.has(word.trim().toLowerCase());
}

export function pickRandomWord(): string {
  const index = Math.floor(Math.random() * WORD_LIST.length);
  return WORD_LIST[index];
}
