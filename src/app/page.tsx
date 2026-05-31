"use client";

import { useEffect, useState } from "react";
import Chat from "@/components/Chat";
import Proforma from "@/components/Proforma";
import Toolbar from "@/components/Toolbar";
import { seedDeal } from "@/lib/seed";
import type { Deal } from "@/lib/types";

const STORAGE_KEY = "yarra:deal:v1";

export default function Page() {
  const [deal, setDeal] = useState<Deal>(seedDeal);
  const [hydrated, setHydrated] = useState(false);

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

  return (
    <div className="grid h-screen w-screen grid-cols-1 lg:grid-cols-[420px_1fr]">
      <aside className="border-r border-rule bg-paper">
        <Chat deal={deal} onDealUpdate={setDeal} />
      </aside>
      <main className="overflow-hidden">
        <div className="border-b border-rule bg-paper px-6 py-2">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>Yarra · AI Proforma</span>
          </div>
          <div className="mt-2">
            <Toolbar deal={deal} onDealLoaded={setDeal} onReset={() => setDeal(seedDeal)} />
          </div>
        </div>
        <div className="h-[calc(100%-7rem)]">
          <Proforma deal={deal} />
        </div>
      </main>
    </div>
  );
}
