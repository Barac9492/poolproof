import DocShell, { Li, Code } from "@/components/DocShell";

export const metadata = { title: "Becoming a builder — Poolproof" };

export default function BuildingPage() {
  return (
    <DocShell
      kicker="FOR BUILDERS"
      title="Becoming a builder"
      lede="You carry the execution risk and take the upside. Stake for an exclusive slot, build against a public test suite, and when a real CI run goes green the escrow releases 74% of the pool to you plus your stake back."
    >
      <h2>How a build slot works</h2>
      <ul>
        <Li>
          A project with a full pool opens a <strong>build slot</strong>. You stake 5% of the pool
          for a 7-day exclusive slot — no wasteful racing, one builder at a time.
        </Li>
        <Li>
          Go green before the deadline → stake returned + 74% of the pool. Time out → part of the
          stake burns and the slot passes to the next builder in queue.
        </Li>
        <Li>Your compute is your cost. That&apos;s the point: execution risk sits with you.</Li>
      </ul>

      <h2>What green means</h2>
      <p>
        Green is not an AI reading your diff. The verification runner executes every acceptance
        test in an isolated child process — the <strong>public suite you can see</strong> plus{" "}
        <strong>hidden holdout tests</strong> that catch code written only to the visible tests.
        All tests pass, or nothing moves.
      </p>
      <p>
        The runner is hardened: a clean environment with no platform secrets, Node&apos;s permission
        model restricting filesystem access to the spec and submission, no child processes.
      </p>

      <h2>Run the suite locally before you stake</h2>
      <p>
        Every spec&apos;s public suite is downloadable from its project page. The harness is open —
        clone the repo and run any spec against a candidate module:
      </p>
      <Code>{`git clone https://github.com/Barac9492/poolproof
cd poolproof

# run the public suite for a spec against your module
node specs/_harness.mjs \\
  specs/<slug> \\
  path/to/your-module.mjs`}</Code>
      <p>
        The harness prints a JSON result per test (pass/fail + detail). Iterate until the public
        suite is all-green locally, then submit — knowing the holdouts still have to pass on the
        server.
      </p>

      <h2>Anatomy of a submission</h2>
      <p>
        A submission is a JS module that exports whatever the spec&apos;s contract card promises
        (e.g. <code>renderAlerts(markdown)</code>, <code>parseDuration(input)</code>). The suite
        imports it and asserts behavior. Nothing else — no framework, no boilerplate.
      </p>

      <h2>Submitting a build</h2>
      <p>
        During the public beta, builds are submitted through us while we harden remote-code
        isolation (network egress is the last sandbox layer in progress). To claim a slot and
        coordinate a submission, stake on an open project and reach out via{" "}
        <a
          href="https://github.com/Barac9492/poolproof/discussions"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub Discussions
        </a>
        . Self-serve git-connected submission is the next milestone — track it there.
      </p>

      <h2>The maintenance annuity</h2>
      <p>
        15% of every pool is held back and streams to you monthly for as long as the test suite
        stays green on main. Software rots; the incentive to keep it working shouldn&apos;t.
      </p>
    </DocShell>
  );
}
