// Historical candidate retained as a public regression artifact.
// Private verification cases rotate independently of repository examples.

const KINDS = { note: "Note", warning: "Warning", tip: "Tip" };

export function renderAlerts(markdown) {
  const blocks = markdown.split(/\n\s*\n/);
  return blocks
    .map((block) => {
      const lines = block.split("\n");
      const m = lines[0].match(/^> \[!([A-Za-z]+)\]\s*$/);
      const kind = m ? KINDS[m[1].toLowerCase()] : undefined;
      if (m && kind) {
        const body = lines
          .slice(1)
          .map((l) => l.replace(/^> ?/, ""))
          .map((l) => `<p>${l}</p>`)
          .join("\n");
        return `<div class="markdown-alert markdown-alert-${m[1].toLowerCase()}"><p class="markdown-alert-title">${kind}</p>\n${body}</div>`;
      }
      if (lines.every((l) => l.startsWith(">"))) {
        const body = lines.map((l) => l.replace(/^> ?/, "")).join("\n");
        return `<blockquote><p>${body}</p></blockquote>`;
      }
      return `<p>${block}</p>`;
    })
    .join("\n");
}
