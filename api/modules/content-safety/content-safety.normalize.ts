import { createHash } from 'node:crypto';

const kanaMap = new Map<string, string>([
  ['ぁ', 'あ'],
  ['ぃ', 'い'],
  ['ぅ', 'う'],
  ['ぇ', 'え'],
  ['ぉ', 'お'],
  ['ゃ', 'や'],
  ['ゅ', 'ゆ'],
  ['ょ', 'よ'],
  ['っ', 'つ'],
]);

const leetMap = new Map<string, string>([
  ['0', 'o'],
  ['1', 'i'],
  ['3', 'e'],
  ['4', 'a'],
  ['5', 's'],
  ['7', 't'],
  ['@', 'a'],
  ['$', 's'],
]);

export const hashText = (text: string) => createHash('sha256').update(text).digest('hex');

export const normalizeSafetyText = (text: string): string => {
  const normalized = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\p{Variation_Selector}/gu, '')
    .replace(/(.)\1{3,}/gu, '$1$1$1');

  let output = '';
  for (const char of normalized) {
    output += kanaMap.get(char) ?? leetMap.get(char) ?? char;
  }

  return output
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
};

export const previewText = (text: string, start: number, end: number) => {
  return text.slice(start, end).slice(0, 48);
};
