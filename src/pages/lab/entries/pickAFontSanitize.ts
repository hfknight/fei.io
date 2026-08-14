/**
 * Reduce an edited specimen's DOM to the only markup the picker honours: <b>, <i>, <br>,
 * and text. Everything else — pasted spans, inline styles, links, headings — is unwrapped
 * to its text. The result is safe to render back with dangerouslySetInnerHTML because
 * nothing survives that wasn't built here from escaped text and this whitelist.
 */

const escapeText = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const serialize = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return escapeText(node.textContent ?? '');
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as Element;
  if (el.tagName === 'BR') return '<br>';
  const inner = Array.from(el.childNodes).map(serialize).join('');
  if (el.tagName === 'B' || el.tagName === 'STRONG') return `<b>${inner}</b>`;
  if (el.tagName === 'I' || el.tagName === 'EM') return `<i>${inner}</i>`;
  return inner;
};

export function sanitizeSpecimenHtml(root: Node): string {
  return Array.from(root.childNodes).map(serialize).join('');
}
