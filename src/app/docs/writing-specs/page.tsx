import DocShell, { Li, Code } from "@/components/DocShell";

export const metadata = { title: "Writing a great spec — Poolproof" };

export default function WritingSpecsPage() {
  return (
    <DocShell
      kicker="FOR SPEC AUTHORS"
      title="Writing a great spec"
      lede="A spec is not a wish. It is a contract card plus acceptance criteria that become an executable test suite. The clearer your criteria, the faster a builder can go green — and the sooner you earn your 3% cut."
    >
      <h2>The two parts of a spec</h2>
      <ul>
        <Li>
          <strong>Contract card</strong> — plain language: what a backer gets, and what they
          explicitly don&apos;t. Disputes are judged against this card, so be specific about
          exclusions (&ldquo;no UI, library only&rdquo;).
        </Li>
        <Li>
          <strong>Acceptance criteria</strong> — 3+ testable statements, one per line. Curation
          turns each into an executable test, plus hidden holdout tests that catch overfitting.
        </Li>
      </ul>

      <h2>What makes a criterion testable</h2>
      <p>
        A good criterion names an <strong>input</strong>, an <strong>observable output</strong>,
        and leaves no room for &ldquo;it depends.&rdquo; Compare:
      </p>
      <ul>
        <Li>
          ❌ <code>handles dates well</code> — untestable. What input? What&apos;s &ldquo;well&rdquo;?
        </Li>
        <Li>
          ✅ <code>parseDuration(&apos;P2W&apos;) returns {"{ weeks: 2 }"}</code> — one input, one
          exact output.
        </Li>
        <Li>
          ✅ <code>returns null for anything not a valid ISO 8601 duration</code> — a clear
          rejection rule.
        </Li>
      </ul>

      <h2>Worked example</h2>
      <p>A spec for a Korean-aware slugify. Criteria (what you write):</p>
      <Code>{`romanizes plain Korean (안녕하세요 → annyeonghaseyo)
mixed Korean + English (안녕 world → annyeong-world)
does not silently drop Korean the way slugify@latest does
lowercases, trims, collapses punctuation to single dashes`}</Code>
      <p>Curation turns each line into a real test the runner executes:</p>
      <Code>{`{
  name: "romanizes plain Korean",
  run: (mod) => assert.equal(
    mod.slugify("안녕하세요"), "annyeonghaseyo"
  ),
}`}</Code>
      <p>
        You can see the full executable suite on any project page under{" "}
        <strong>Executable Suite</strong> — the tests are public and downloadable, so builders (and
        you) know exactly what green means. Hidden holdouts are never shown.
      </p>

      <h2>Getting to green faster</h2>
      <ul>
        <Li>Keep the scope tight. One module, one job. Big specs stall.</Li>
        <Li>
          State exclusions loudly in the contract card — every &ldquo;don&apos;t get&rdquo; is a
          test a builder doesn&apos;t have to pass.
        </Li>
        <Li>
          Base it on a real, long-open request (link the GitHub issue). Concrete demand fills pools.
        </Li>
        <Li>
          Set an honest credit goal. Under 500 runs as a single-builder commission; larger pools
          open to staked builders.
        </Li>
      </ul>

      <h2>What you earn</h2>
      <p>
        When a build goes green, the escrow releases 74% to the builder, 15% to a maintenance
        reserve, <strong>3% to you, the spec author</strong>, and 8% to the platform. If nothing
        goes green by the deadline, every backer is refunded in full and no one is charged.
      </p>
    </DocShell>
  );
}
