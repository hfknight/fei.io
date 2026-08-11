import { describe, it, expect } from 'vitest';
import { sanitizeSpecimenHtml } from './pickAFontSanitize';

const from = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return sanitizeSpecimenHtml(div);
};

describe('sanitizeSpecimenHtml', () => {
  it('keeps bold, italic, and line breaks', () => {
    expect(from('plain <b>bold</b> and <i>italic</i><br>next')).toBe(
      'plain <b>bold</b> and <i>italic</i><br>next',
    );
  });

  it('normalises strong/em to b/i', () => {
    expect(from('<strong>loud</strong> <em>lean</em>')).toBe('<b>loud</b> <i>lean</i>');
  });

  it('unwraps everything else to its text', () => {
    expect(from('<span style="color:red">styled</span> <a href="https://x.y">link</a>')).toBe(
      'styled link',
    );
    expect(from('<div><h1>pasted <b>heading</b></h1></div>')).toBe('pasted <b>heading</b>');
  });

  it('escapes text so nothing executable survives', () => {
    expect(from('a &lt;script&gt; tag')).toBe('a &lt;script&gt; tag');
    const div = document.createElement('div');
    div.appendChild(document.createTextNode('<img onerror=x>'));
    expect(sanitizeSpecimenHtml(div)).toBe('&lt;img onerror=x&gt;');
  });

  it('keeps formatting nested inside unwrapped elements', () => {
    expect(from('<p>one <b>two</b></p>')).toBe('one <b>two</b>');
  });
});
