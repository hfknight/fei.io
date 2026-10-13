import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WRITING_META } from './index';

const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

describe('/writing meta', () => {
  it('differs from the home page head, which is the duplicate signal it exists to break', () => {
    const homeTitle = indexHtml.match(/<title>(.*?)<\/title>/)?.[1];
    const homeDescription = indexHtml.match(/<meta name="description" content="(.*?)"/)?.[1];

    expect(homeTitle).toBeTruthy();
    expect(homeDescription).toBeTruthy();
    expect(WRITING_META.title).not.toBe(homeTitle);
    expect(WRITING_META.description).not.toBe(homeDescription);
  });
});
