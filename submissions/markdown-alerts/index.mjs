// Public candidate artifact. Its behavior is inspectable by design;
// production verification still uses independently rotated private cases.

const KINDS = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
};

export function renderAlerts(markdown) {
  const blocks = String(markdown).split(/\n\s*\n/);
  return blocks.map(renderBlock).join("\n");
}

function renderBlock(block) {
  const lines = block.split("\n");
  const isQuote = lines.length > 0 && lines.every((l) => /^>/.test(l));
  if (!isQuote) return `<p>${block}</p>`;

  const stripped = lines.map((l) => l.replace(/^>\s?/, ""));
  const m = stripped[0].match(/^\[!([A-Za-z]+)\]\s*$/);
  const kindKey = m ? m[1].toLowerCase() : null;

  if (kindKey && KINDS[kindKey]) {
    const body = stripped
      .slice(1)
      .filter((l) => l.length > 0)
      .map((l) => `<p>${l}</p>`)
      .join("\n");
    return (
      `<div class="markdown-alert markdown-alert-${kindKey}">` +
      `<p class="markdown-alert-title">${KINDS[kindKey]}</p>\n${body}</div>`
    );
  }

  const body = stripped.map((l) => `<p>${l}</p>`).join("\n");
  return `<blockquote>${body}</blockquote>`;
}
