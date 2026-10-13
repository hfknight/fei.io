import { describe, expect, it } from 'vitest';
import { excerpt } from './excerpt';

const FANMATCHDAY =
  "This summer I built and ran [fanmatchday.com](https://fanmatchday.com), a matchday planner for World Cup 2026. Tell it your hotel and your match, and it gives you a door-to-door plan: when to leave, which train, whether your backpack clears FIFA's bag rules, whether it'll be 100°F at kickoff.";

describe('excerpt', () => {
  it('turns a real opening into plain text, cut on a word with an ellipsis', () => {
    const out = excerpt(FANMATCHDAY);

    expect(out.startsWith('This summer I built and ran fanmatchday.com, a matchday planner')).toBe(true);
    expect(out).not.toContain('](');
    expect(out.length).toBeLessThanOrEqual(155);
    expect(out.endsWith('…')).toBe(true);
    // Cut at a word boundary: what precedes the ellipsis is a prefix ending in a whole word.
    const head = out.slice(0, -1);
    expect(FANMATCHDAY.replace('[fanmatchday.com](https://fanmatchday.com)', 'fanmatchday.com')).toMatch(
      new RegExp(`^${head.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s`),
    );
  });

  it('skips a leading image and heading to reach the first paragraph', () => {
    const body = '![cover](https://media.fei.io/a.webp)\n\n## A heading\n\nThe actual opening paragraph.\n\nSecond.';

    expect(excerpt(body)).toBe('The actual opening paragraph.');
  });

  it('skips a code fence, including blank lines inside it', () => {
    const body = '```ts\nconst a = 1;\n\nconst b = 2;\n```\n\nAfter the code.';

    expect(excerpt(body)).toBe('After the code.');
  });

  it('skips quotes, lists, tables, HTML blocks and thematic breaks', () => {
    const body = '> quoted\n\n- item\n\n1. numbered\n\n| a | b |\n\n<div>x</div>\n\n---\n\n***\n\nProse at last.';

    expect(excerpt(body)).toBe('Prose at last.');
  });

  it('strips inline markup but leaves snake_case and a lone asterisk alone', () => {
    const body = 'A **bold** and *soft* and __strong__ and _em_ word, `code`, <https://fei.io>, my_var_name and 2 * 3.';

    expect(excerpt(body)).toBe(
      'A bold and soft and strong and em word, code, https://fei.io, my_var_name and 2 * 3.',
    );
  });

  it('returns a short paragraph verbatim, with no ellipsis', () => {
    expect(excerpt('Short and sweet.')).toBe('Short and sweet.');
  });

  it('drops trailing punctuation before the ellipsis', () => {
    expect(excerpt('alpha beta, gamma delta', 12)).toBe('alpha beta…');
  });

  it('returns an empty string when there is no prose', () => {
    expect(excerpt('')).toBe('');
    expect(excerpt('# One\n\n## Two\n\n![x](y)')).toBe('');
  });
});
