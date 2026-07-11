"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// After returning from Polar checkout (?status=success), the order.paid webhook
// credits the balance asynchronously. Refresh the whole route tree (including
// the header layout) a few times to reflect the new balance without a manual
// reload — and to catch a webhook that lands a beat after the redirect.
export default function RefreshOnSuccess({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const delays = [500, 2000, 5000];
    const timers = delays.map((d) => setTimeout(() => router.refresh(), d));
    return () => timers.forEach(clearTimeout);
  }, [active, router]);
  return null;
}
