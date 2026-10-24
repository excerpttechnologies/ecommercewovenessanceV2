import { cn } from "@/lib/utils";

/**
 * Minimal, dependency-free markdown → HTML for CMS pages (headings, paragraphs,
 * bold/italic, links, lists). Swap for `react-markdown` if richer syntax is needed.
 */
export function Markdown({ source, className }: { source: string; className?: string }) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2">$1</a>');
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const html = blocks
    .map((b) => {
      const t = b.trim();
      if (!t) return "";
      const h = /^(#{1,4})\s+(.*)$/.exec(t);
      if (h) return `<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`;
      if (/^(-|\*)\s/.test(t)) return `<ul>${t.split("\n").map((l) => `<li>${inline(l.replace(/^(-|\*)\s+/, ""))}</li>`).join("")}</ul>`;
      if (/^\d+\.\s/.test(t)) return `<ol>${t.split("\n").map((l) => `<li>${inline(l.replace(/^\d+\.\s+/, ""))}</li>`).join("")}</ol>`;
      return `<p>${inline(t).replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");
  return <div className={cn("prose-we", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
