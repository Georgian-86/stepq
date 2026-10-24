import { Marked, type Tokens } from 'marked';

export interface PolicyHeading {
  id: string;
  text: string;
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';

/** Only web, mail and in-page links survive; anything else (javascript:, data:) becomes plain text. */
const SAFE_HREF = /^(https?:\/\/|mailto:|#|\/(?!\/))/i;

/** Unique ids in document order (`what-we-collect`, `what-we-collect-2`). */
function idFactory() {
  const seen = new Map<string, number>();
  return (text: string) => {
    const base = slug(text);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  };
}

/**
 * Renders the client's Markdown policy to HTML. Raw HTML in the source is dropped (not
 * rendered, not escaped into view), images are reduced to their alt text and unsafe link
 * schemes are removed, so the output is safe for dangerouslySetInnerHTML.
 */
export function renderPolicy(markdown: string): { html: string; headings: PolicyHeading[] } {
  const headings: PolicyHeading[] = [];
  const nextId = idFactory();
  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({
    renderer: {
      html: () => '',
      image: (t: Tokens.Image) => escape(t.text),
      link(t: Tokens.Link) {
        const inner = this.parser.parseInline(t.tokens);
        if (!SAFE_HREF.test(t.href.trim())) return inner;
        const external = /^https?:/i.test(t.href);
        const rel = external ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${escape(t.href)}"${rel}>${inner}</a>`;
      },
      heading(t: Tokens.Heading) {
        const inner = this.parser.parseInline(t.tokens);
        // Page title is the h1; policy headings start at h2 so the outline stays valid.
        const level = Math.min(Math.max(t.depth, 1) + 1, 6);
        const id = nextId(t.text);
        if (level === 2) headings.push({ id, text: t.text });
        return `<h${level} id="${id}">${inner}</h${level}>\n`;
      },
    },
  });
  const html = marked.parse(markdown, { async: false });
  return { html, headings };
}
