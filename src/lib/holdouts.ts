export const PRIVATE_HOLDOUT_ENV: Readonly<Record<string, string>> = {
  "iso-duration": "HOLDOUT_ISO_DURATION_B64",
  josa: "HOLDOUT_JOSA_B64",
  "markdown-alerts": "HOLDOUT_MARKDOWN_ALERTS_B64",
  "slugify-korean": "HOLDOUT_SLUGIFY_KOREAN_B64",
  "wordle-solver": "HOLDOUT_WORDLE_SOLVER_B64",
};

export function holdoutsConfigured(): boolean {
  return Object.values(PRIVATE_HOLDOUT_ENV).every((envName) => Boolean(process.env[envName]));
}
