import Legal from "@/components/Legal";

export const metadata = { title: "Terms — Poolproof" };

export default function TermsPage() {
  return (
    <Legal title="Terms of Service" updated="2026-07-11">
      <h2>1. What Poolproof is</h2>
      <p>
        Poolproof is a coordination platform. Backers pool credits behind an executable
        specification; builders stake collateral for time-boxed build slots; an automated
        verification run decides whether escrow releases. Credits are prepaid platform units for
        funding verified software builds. They are not equity, securities, tokens, deposits, or
        investments, and they carry no right to profit.
      </p>
      <h2>2. Escrow and release</h2>
      <p>
        Pledged credits are held in project escrow. They are released if and only if a
        verification run passes every acceptance test in the project&apos;s suite, including
        holdout tests, within the project deadline. The split at release is: 74% to the builder
        (plus stake return), 15% to the maintenance annuity reserve, 3% to the spec author, 8% to
        the platform. The escrow ledger on each project page is the authoritative record.
      </p>
      <h2>3. Builders and stakes</h2>
      <p>
        Builders claim slots by staking 5% of the pool. Builders bear their own build costs. A
        slot that expires without green forfeits part of its stake. Submitting code you do not
        have the right to submit is prohibited.
      </p>
      <h2>4. Outputs and licensing</h2>
      <p>
        Verified outputs are published under the MIT license together with the exact test suite
        they passed. The legal status of AI-generated code is unsettled in several jurisdictions;
        treat outputs as public goods. Poolproof makes no warranty that outputs are fit for any
        particular purpose beyond the published acceptance suite.
      </p>
      <h2>5. Honest-failure principle</h2>
      <p>
        Red runs, expired slots and refunds are recorded permanently. We do not edit history, and
        project resets require a logged reason on the ledger.
      </p>
      <h2>6. Beta status</h2>
      <p>
        This deployment is a public beta. Credits have no cash value in the beta and balances may
        be reset with notice on the site.
      </p>
    </Legal>
  );
}
