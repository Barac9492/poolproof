import Legal from "@/components/Legal";

export const metadata = { title: "Privacy — Poolproof" };

export default function PrivacyPage() {
  return (
    <Legal title="Privacy Policy" updated="2026-07-11">
      <h2>What we collect</h2>
      <p>
        A handle and a salted password hash. No email is required in the beta. Your pledges,
        stakes, specs and verification runs are recorded against your handle on public ledgers —
        that is the product, not a side effect.
      </p>
      <h2>What we do not do</h2>
      <p>
        No ad trackers, no analytics beyond aggregate request logs, no sale of data, no
        third-party data sharing. Session cookies are HttpOnly and used only to keep you signed
        in.
      </p>
      <h2>Public by design</h2>
      <p>
        Ledger entries are permanent and public. Choose your handle accordingly. Account deletion
        removes your credentials; ledger history remains, attributed to the (now unclaimable)
        handle, because escrow history must stay auditable.
      </p>
    </Legal>
  );
}
