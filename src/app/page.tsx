"use client";

import { useEffect, useState } from "react";
import Chat from "@/components/Chat";
import Proforma from "@/components/Proforma";
import { seedDeal } from "@/lib/seed";
import type { Deal } from "@/lib/types";

const STORAGE_KEY = "yarra:deal:v1";

export default function Page() {
  const [deal, setDeal] = useState<Deal>(seedDeal);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage if present (lets the user keep edits across reloads).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Deal;
        if (parsed && parsed.id) setDeal(parsed);
      }
    } catch {
      // Ignore malformed storage; fall through to seed.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(deal));
    } catch {
      // Storage quota or private-mode — non-fatal.
    }
  }, [deal, hydrated]);

  function reset() {
    setDeal(seedDeal);
  }

  return (
    <div className="grid h-screen w-screen grid-cols-1 lg:grid-cols-[420px_1fr]">
      <aside className="border-r border-rule bg-paper">
        <Chat deal={deal} onDealUpdate={setDeal} />
      </aside>
      <main className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-rule bg-paper px-6 py-2 text-[11px] text-muted">
          <span>Yarra · AI Proforma</span>
          <button
            onClick={reset}
            className="rounded border border-rule px-2 py-0.5 hover:border-ink"
            type="button"
          >
            Reset to template
          </button>
        </div>
        <div className="h-[calc(100%-2.25rem)]">
          <Proforma deal={deal} />
        </div>
      </main>
    </div>
  );
}
