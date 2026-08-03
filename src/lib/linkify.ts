export type DescriptionToken =
  | { kind: "text"; value: string }
  | { kind: "link"; href: string; label: string };

const HTTP_URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_SENTENCE_PUNCTUATION = /[.,!?;:]+$/;

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function tokenizeHttpLinks(text: string): DescriptionToken[] {
  const tokens: DescriptionToken[] = [];
  let lastIndex = 0;

  const addText = (value: string) => {
    if (!value) return;
    const previous = tokens[tokens.length - 1];
    if (previous?.kind === "text") {
      previous.value += value;
    } else {
      tokens.push({ kind: "text", value });
    }
  };

  for (const match of text.matchAll(HTTP_URL_PATTERN)) {
    const rawValue = match[0];
    const matchIndex = match.index ?? 0;
    addText(text.slice(lastIndex, matchIndex));

    const linkValue = rawValue.replace(TRAILING_SENTENCE_PUNCTUATION, "");
    if (!linkValue || !isSafeHttpUrl(linkValue)) {
      addText(rawValue);
    } else {
      tokens.push({ kind: "link", href: linkValue, label: linkValue });
      addText(rawValue.slice(linkValue.length));
    }

    lastIndex = matchIndex + rawValue.length;
  }

  addText(text.slice(lastIndex));
  return tokens;
}
