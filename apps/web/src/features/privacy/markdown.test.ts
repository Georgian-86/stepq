import { describe, expect, it } from 'vitest';
import { renderPolicy } from './markdown';

describe('renderPolicy', () => {
  it('renders headings (demoted below the page h1) with ids and a contents list', () => {
    const { html, headings } = renderPolicy(
      '# What we collect\n\ntext\n\n# What we collect\n\n## Sub',
    );
    expect(html).toContain('<h2 id="what-we-collect">What we collect</h2>');
    expect(html).toContain('<h2 id="what-we-collect-2">');
    expect(html).toContain('<h3 id="sub">Sub</h3>');
    expect(headings).toEqual([
      { id: 'what-we-collect', text: 'What we collect' },
      { id: 'what-we-collect-2', text: 'What we collect' },
    ]);
  });

  it('drops raw HTML and scripts', () => {
    const { html } = renderPolicy(
      'hi <script>alert(1)</script> <img src=x onerror=alert(1)>\n\n<div onclick="x()">y</div>',
    );
    expect(html).not.toMatch(/<script|onerror|onclick|<div|<img/i);
  });

  it('keeps safe links and strips unsafe schemes and images', () => {
    const { html } = renderPolicy(
      '[ok](https://stepq.in) [mail](mailto:a@b.co) [bad](javascript:alert(1)) ![alt](https://x/y.png)',
    );
    expect(html).toContain(
      '<a href="https://stepq.in" target="_blank" rel="noopener noreferrer">ok</a>',
    );
    expect(html).toContain('href="mailto:a@b.co"');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<img');
    expect(html).toContain('alt');
  });
});
