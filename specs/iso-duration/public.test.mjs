import assert from "node:assert/strict";

// Acceptance tests: ISO 8601 duration parser.
// Submission must export parseDuration(input: string): object | null

export default [
  {
    name: "parses full designator form P1Y2M3DT4H5M6S",
    run: (mod) => {
      assert.deepEqual(mod.parseDuration("P1Y2M3DT4H5M6S"), {
        years: 1, months: 2, weeks: 0, days: 3, hours: 4, minutes: 5, seconds: 6,
      });
    },
  },
  {
    name: "parses week form P2W",
    run: (mod) => {
      assert.deepEqual(mod.parseDuration("P2W"), {
        years: 0, months: 0, weeks: 2, days: 0, hours: 0, minutes: 0, seconds: 0,
      });
    },
  },
  {
    name: "parses time-only form PT90M",
    run: (mod) => {
      const d = mod.parseDuration("PT90M");
      assert.equal(d.minutes, 90);
      assert.equal(d.hours, 0);
    },
  },
  {
    name: "parses fractional seconds PT0.5S",
    run: (mod) => {
      assert.equal(mod.parseDuration("PT0.5S").seconds, 0.5);
    },
  },
  {
    name: "returns null for garbage input",
    run: (mod) => {
      assert.equal(mod.parseDuration("tomorrow"), null);
      assert.equal(mod.parseDuration("P"), null);
      assert.equal(mod.parseDuration(""), null);
    },
  },
];
