import assert from "node:assert/strict";

// Acceptance tests: GitHub-style alerts markdown extension.
// Submission must export renderAlerts(markdown: string): string

export default [
  {
    name: "converts > [!NOTE] blockquote into a note alert div",
    run: (mod) => {
      const html = mod.renderAlerts("> [!NOTE]\n> Useful information.");
      assert.ok(html.includes('class="markdown-alert markdown-alert-note"'), "missing alert wrapper");
      assert.ok(html.includes('<p class="markdown-alert-title">Note</p>'), "missing title");
      assert.ok(html.includes("Useful information."), "missing body text");
    },
  },
  {
    name: "converts [!WARNING] with Warning title",
    run: (mod) => {
      const html = mod.renderAlerts("> [!WARNING]\n> Careful now.");
      assert.ok(html.includes("markdown-alert-warning"));
      assert.ok(html.includes('<p class="markdown-alert-title">Warning</p>'));
    },
  },
  {
    name: "converts [!TIP] with Tip title",
    run: (mod) => {
      const html = mod.renderAlerts("> [!TIP]\n> Try this.");
      assert.ok(html.includes("markdown-alert-tip"));
      assert.ok(html.includes('<p class="markdown-alert-title">Tip</p>'));
    },
  },
  {
    name: "leaves ordinary blockquotes untouched",
    run: (mod) => {
      const html = mod.renderAlerts("> just a quote");
      assert.ok(!html.includes("markdown-alert"), "plain quote must not become an alert");
      assert.ok(html.includes("just a quote"));
    },
  },
  {
    name: "marker is case-insensitive ([!note])",
    run: (mod) => {
      const html = mod.renderAlerts("> [!note]\n> lower case works");
      assert.ok(html.includes("markdown-alert-note"));
      assert.ok(html.includes('<p class="markdown-alert-title">Note</p>'));
    },
  },
  {
    name: "multi-line alert bodies are preserved in order",
    run: (mod) => {
      const html = mod.renderAlerts("> [!NOTE]\n> line one\n> line two");
      const i1 = html.indexOf("line one");
      const i2 = html.indexOf("line two");
      assert.ok(i1 !== -1 && i2 !== -1 && i1 < i2, "body lines missing or reordered");
    },
  },
];
