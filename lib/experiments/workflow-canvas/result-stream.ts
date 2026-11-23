/**
 * Split a finished result into words for a local type-on reveal.
 * The trailing space stays with its word, and a lone middot stays with
 * the word before it, so each step still reads as part of the sentence.
 */
export function resultStreamWords(text: string): string[] {
  const tokens = text.match(/\S+\s*/g);
  if (!tokens) {
    return [];
  }
  const words: string[] = [];
  for (const token of tokens) {
    const bare = token.trim();
    const previous = words.length > 0 ? words[words.length - 1] : undefined;
    if (previous !== undefined && /^[·•.,:;!?]+$/.test(bare)) {
      words[words.length - 1] = `${previous.trimEnd()} ${token}`;
    } else {
      words.push(token);
    }
  }
  return words;
}

export function resultStreamPrefix(
  words: readonly string[],
  count: number,
): string {
  if (count <= 0) {
    return "";
  }
  return words.slice(0, count).join("");
}
