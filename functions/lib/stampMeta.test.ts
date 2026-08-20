import { describe, expect, it } from 'vitest';
import { serializeJsonLd } from './stampMeta';

/**
 * Only the serializer is exercised here. `stampMeta` itself is an HTMLRewriter call, which
 * exists in the Workers runtime and not in vitest's — the part that can be wrong in a way a
 * glance at the page won't catch is the JSON that goes inside the script tag.
 */

const meta = { title: 'A title', description: 'A description' };

describe('serializeJsonLd', () => {
  it('fills in the context, the canonical url, and the description', () => {
    const parsed = JSON.parse(serializeJsonLd({ ...meta, jsonLd: { '@type': 'WebApplication' } }, 'https://fei.io/lab/x'));
    expect(parsed).toEqual({
      '@context': 'https://schema.org',
      url: 'https://fei.io/lab/x',
      description: 'A description',
      '@type': 'WebApplication',
    });
  });

  it('lets the page override a derived field', () => {
    const parsed = JSON.parse(
      serializeJsonLd({ ...meta, jsonLd: { description: 'The longer one' } }, 'https://fei.io/lab/x'),
    );
    expect(parsed.description).toBe('The longer one');
  });

  it('escapes < so a closing script tag in the data cannot end the block early', () => {
    // The failure this guards: JSON.stringify leaves `</script>` intact, which is legal JSON
    // and a broken document — the rest of the object would spill into the page as markup.
    const serialized = serializeJsonLd(
      { ...meta, description: 'Ends the block </script><img onerror=alert(1)>' },
      'https://fei.io/lab/x',
    );

    expect(serialized).not.toContain('</script>');
    expect(serialized).not.toContain('<img');
    expect(serialized).toContain('\\u003c/script>');
    // Still valid JSON, and the value survives intact once parsed.
    expect(JSON.parse(serialized).description).toBe('Ends the block </script><img onerror=alert(1)>');
  });

  it('emits nothing but the derived fields when a page has no schema of its own', () => {
    expect(JSON.parse(serializeJsonLd(meta, 'https://fei.io/lab/x'))).toEqual({
      '@context': 'https://schema.org',
      url: 'https://fei.io/lab/x',
      description: 'A description',
    });
  });
});
