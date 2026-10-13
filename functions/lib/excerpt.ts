/* A post's first prose paragraph as plain text, for a meta description. The body is markdown,
 * and the first block is often not prose: a cover image, a heading, a code fence. Skipping
 * those means the description reads like the opening of the piece rather than its markup. */

const LIST_ITEM = /^([-*+]|\d+[.)])\s/;
const THEMATIC_BREAK = /^(-{3,}|\*{3,}|_{3,})\s*$/;
const IMAGES_ONLY = /^(!\[[^\]]*\]\([^)]*\)\s*)+$/;

function blocks(markdown: string): string[] {
  const out: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;

  const flush = () => {
    if (current.length) out.push(current.join('\n'));
    current = [];
  };

  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (fence) {
      // Blank lines inside a fence do not end it; only the matching marker does.
      if (trimmed.startsWith(fence)) fence = null;
      continue;
    }
    const open = trimmed.match(/^(`{3,}|~{3,})/);
    if (open) {
      flush();
      fence = open[1].slice(0, 3);
      continue;
    }
    if (trimmed === '') flush();
    else current.push(trimmed);
  }
  flush();
  return out;
}

function isProse(block: string): boolean {
  return !(
    block.startsWith('#') ||
    block.startsWith('>') ||
    block.startsWith('|') ||
    block.startsWith('<') && !/^<https?:\/\/[^>\s]+>/.test(block) ||
    LIST_ITEM.test(block) ||
    THEMATIC_BREAK.test(block) ||
    IMAGES_ONLY.test(block)
  );
}

function toPlain(block: string): string {
  return (
    block
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/<(https?:\/\/[^>\s]+)>/g, '$1')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/<\/?[a-zA-Z][^>]*>/g, '')
      // Paired markers only, hugging non-space text: a lone `*` or a snake_case word stays.
      .replace(/\*\*(?=\S)([^*]+?)(?<=\S)\*\*/g, '$1')
      .replace(/\*(?=\S)([^*]+?)(?<=\S)\*/g, '$1')
      .replace(/(?<!\w)__(?=\S)(.+?)(?<=\S)__(?!\w)/g, '$1')
      .replace(/(?<!\w)_(?=\S)([^_]+?)(?<=\S)_(?!\w)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export function excerpt(markdown: string, max = 155): string {
  const block = blocks(markdown).find(isProse);
  if (!block) return '';

  const text = toPlain(block);
  if (text.length <= max) return text;

  // A space at index <= max - 1 keeps head + the ellipsis within max, and never splits a word.
  const cut = text.lastIndexOf(' ', max - 1);
  const head = cut > 0 ? text.slice(0, cut) : text.slice(0, max - 1);
  return `${head.replace(/[\s,;:]+$/, '')}…`;
}
