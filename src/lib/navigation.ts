/** Normalize a post-auth destination to a same-origin path. Rejects protocol-
 * relative URLs, backslash variants, control characters, and foreign origins. */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) {
    return "/";
  }
  try {
    const base = new URL("https://poolproof.invalid");
    const parsed = new URL(value, base);
    if (parsed.origin !== base.origin) return "/";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}
