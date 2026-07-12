import Legal from "@/components/Legal";

export const metadata = { title: "Privacy — Poolproof" };

export default function PrivacyPage() {
  return (
    <Legal title="Privacy Policy" updated="2026-07-12">
      <h2>What we collect</h2>
      <p>
        You sign in with GitHub or Google. From your OAuth provider we receive and store your
        verified email address, display name, avatar URL, and provider account ID; we use them
        for sign-in, account recovery, and service notices — nothing else. Your public handle is
        chosen by you. Your pledges, stakes, specs and verification runs are recorded against
        your handle on public ledgers — that is the product, not a side effect. Your email and
        real name are never shown on ledgers.
      </p>
      <h2>Payments</h2>
      <p>
        Credit purchases are processed by Polar (our merchant of record). Polar collects and
        controls your card and billing details under its own privacy policy; we never see your
        card number. We store only the credit amounts credited to your balance.
      </p>
      <h2>What we do not do</h2>
      <p>
        No ad trackers, no analytics beyond aggregate request logs, no sale of data, no sharing
        with third parties beyond the processors named above (OAuth provider, Polar, and our
        hosting/database providers). Session cookies are HttpOnly and used only to keep you
        signed in.
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
