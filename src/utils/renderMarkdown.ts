import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import DOMPurify from "dompurify";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

md.options.highlight = (code: string, lang: string) => {
  if (lang && hljs.getLanguage(lang)) {
    try {
      const highlighted = hljs.highlight(code, {
        language: lang,
        ignoreIllegals: true,
      }).value;

      return `<pre class="hljs"><code class="language-${lang}">${highlighted}</code></pre>`;
    } catch {
      // ignore
    }
  }

  const escaped = md.utils.escapeHtml(code);
  return `<pre class="hljs"><code>${escaped}</code></pre>`;
};

export function renderMarkdown(content: string) {
  return DOMPurify.sanitize(md.render(content));
}