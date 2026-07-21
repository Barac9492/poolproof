import Legal from "@/components/Legal";

export const metadata = { title: "Refund policy — Poolproof" };

export default function RefundsPage() {
  return (
    <Legal title="Refund Policy" updated="2026-07-21">
      <h2>The rule</h2>
      <p>
        Money moves only on green. Until a verification run passes the full acceptance suite,
        every pledged credit sits in escrow and remains refundable.
      </p>
      <h2>Automatic full refunds</h2>
      <p>
        If a project reaches its deadline without a green run, all escrowed pledges refund in
        full — automatically, to the credit, recorded on the project ledger. If a spec is
        withdrawn before its executable suite lands, the same applies.
      </p>
      <h2>What is not refundable</h2>
      <p>
        Escrow released by an authenticated green run within both the project and slot deadlines
        is final. Builder stake portions forfeited by expired slots are burned per the terms, not refunded.
      </p>
      <h2>Reconciliation</h2>
      <p>
        Every refund is itemized per backer on the public ledger. Splits and refunds are computed
        so totals reconcile exactly — if the ledger ever fails to sum, that is a bug we treat as
        severity zero.
      </p>
    </Legal>
  );
}
