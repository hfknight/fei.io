import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_PROJECTS } from './projects';

const llms = readFileSync(resolve(process.cwd(), 'public/llms.txt'), 'utf8');

describe('projects data', () => {
  it('has a url on every project, which is what lets a crawler find each one', () => {
    for (const p of ALL_PROJECTS) expect(p.url, p.name).toBeTruthy();
  });

  it('writes urls without a trailing slash, so the page, the head and llms.txt agree', () => {
    for (const p of ALL_PROJECTS) expect(p.url!.endsWith('/'), p.name).toBe(false);
  });

  it('lists every project in public/llms.txt', () => {
    for (const p of ALL_PROJECTS) expect(llms, p.name).toContain(p.url);
  });

  it('has unique names, which are React keys', () => {
    const names = ALL_PROJECTS.map(p => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
