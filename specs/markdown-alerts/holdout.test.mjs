import assert from "node:assert/strict";

// Holdout tests: not shown to builders. Guard against overfitting to the
// public suite (Goodhart defense).

export default [
  {
    name: "holdout: supports all five GitHub alert kinds (IMPORTANT, CAUTION)",
    run: (mod) => {
      const imp = mod.renderAlerts("> [!IMPORTANT]\n> Key info.");
      assert.ok(imp.includes("markdown-alert-important"));
      assert.ok(imp.includes('<p class="markdown-alert-title">Important</p>'));
      const cau = mod.renderAlerts("> [!CAUTION]\n> Danger.");
      assert.ok(cau.includes("markdown-alert-caution"));
      assert.ok(cau.includes('<p class="markdown-alert-title">Caution</p>'));
    },
  },
  {
    name: "holdout: tolerates missing space after > marker (>[!note])",
    run: (mod) => {
      const html = mod.renderAlerts(">[!NOTE]\n>compact form");
      assert.ok(html.includes("markdown-alert-note"));
      assert.ok(html.includes("compact form"));
    },
  },
  {
    name: "holdout: unknown alert kind falls back to plain blockquote",
    run: (mod) => {
      const html = mod.renderAlerts("> [!BANANA]\n> not a real alert");
      assert.ok(!html.includes("markdown-alert"), "unknown kinds must not render as alerts");
    },
  },
  {
    name: "holdout: two alerts in one document both render",
    run: (mod) => {
      const html = mod.renderAlerts("> [!NOTE]\n> first\n\n> [!TIP]\n> second");
      assert.ok(html.includes("markdown-alert-note"));
      assert.ok(html.includes("markdown-alert-tip"));
    },
  },
];
