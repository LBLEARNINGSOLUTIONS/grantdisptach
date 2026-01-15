"use client";

import { useEffect, useState } from "react";

export default function ChangesClient() {
  const [changes, setChanges] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/audit");
      const data = await res.json();
      setChanges(data.changes ?? []);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recent Changes</h1>
          <p className="text-sm text-neutral-600">Last 7 days of updates.</p>
        </div>
        <a href="/" className="rounded-xl border border-ink px-3 py-2 text-sm">
          Back to Today
        </a>
      </header>

      <div className="rounded-3xl bg-white/80 p-5 shadow space-y-3">
        {changes.length === 0 ? (
          <p className="text-sm text-neutral-500">No recent updates.</p>
        ) : (
          changes.map((change) => (
            <div key={change.id} className="border-b border-neutral-100 pb-3">
              <div className="text-sm text-neutral-500">
                {new Date(change.occurredAt).toLocaleString()} · {change.user?.name}
              </div>
              <div className="font-medium">{change.summary}</div>
              <div className="text-xs text-neutral-500">
                {change.entityType} · {change.action}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
