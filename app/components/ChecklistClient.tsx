"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CheckColumn, DailyCheckRecord, Driver, RecordStatus } from "@/app/lib/types";
import { groupOrder, statusColors, statusCycle, timeBlocks } from "@/app/lib/format";
import clsx from "clsx";

const blockedReasons = [
  "No response",
  "Driver unavailable",
  "Equipment issue",
  "Other",
];

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

type OverviewResponse = {
  drivers: Driver[];
  checks: CheckColumn[];
  records: DailyCheckRecord[];
};

type RecordMap = Record<string, DailyCheckRecord>;

const getKey = (driverId: string, checkId: string) => `${driverId}-${checkId}`;

export default function ChecklistClient() {
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(() => {
    return searchParams.get("date") ?? formatDateInput(new Date());
  });
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [checks, setChecks] = useState<CheckColumn[]>([]);
  const [recordMap, setRecordMap] = useState<RecordMap>({});
  const [groupFilter, setGroupFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [blockedPrompt, setBlockedPrompt] = useState<{
    driverId: string;
    checkId: string;
    status: RecordStatus;
  } | null>(null);
  const [blockedReason, setBlockedReason] = useState(blockedReasons[0]);
  const [blockedNote, setBlockedNote] = useState("");
  const [notePanel, setNotePanel] = useState<DailyCheckRecord | null>(null);
  const [instructionPanel, setInstructionPanel] = useState<CheckColumn | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/overview?date=${selectedDate}`);
      const data: OverviewResponse = await res.json();
      setDrivers(data.drivers);
      setChecks(data.checks);
      const map: RecordMap = {};
      data.records.forEach((record) => {
        map[getKey(record.driverId, record.checkId)] = record;
      });
      setRecordMap(map);
    };
    load();
  }, [selectedDate]);

  useEffect(() => {
    const focus = searchParams.get("focus");
    if (!focus) return;
    const element = document.getElementById(`cell-${focus}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  }, [drivers, checks, searchParams]);

  const groupedDrivers = useMemo(() => {
    const filtered = drivers.filter((driver) => {
      if (groupFilter !== "All" && driver.group !== groupFilter) return false;
      if (query && !driver.name.toLowerCase().includes(query.toLowerCase())) return false;
      return driver.isActive;
    });

    return groupOrder.map((group) => ({
      group,
      drivers: filtered
        .filter((driver) => driver.group === group)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  }, [drivers, groupFilter, query]);

  const checksByBlock = useMemo(() => {
    return timeBlocks.map((block) => ({
      block,
      checks: checks
        .filter((check) => check.timeBlock === block && check.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  }, [checks]);

  const handleUpdate = async (
    driverId: string,
    checkId: string,
    status: RecordStatus,
    note?: string | null,
    blockedReasonValue?: string | null
  ) => {
    const key = getKey(driverId, checkId);
    const existing = recordMap[key];

    const optimistic: DailyCheckRecord = {
      id: existing?.id ?? `temp-${key}`,
      date: selectedDate,
      driverId,
      checkId,
      status,
      startedAt: existing?.startedAt ?? null,
      completedAt: existing?.completedAt ?? null,
      updatedAt: new Date().toISOString(),
      updatedByUserId: existing?.updatedByUserId ?? "",
      blockedReason: blockedReasonValue ?? null,
      note: note ?? null,
    };

    setRecordMap((prev) => ({ ...prev, [key]: optimistic }));

    await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: selectedDate,
        driverId,
        checkId,
        status,
        blockedReason: blockedReasonValue ?? null,
        note: note ?? null,
      }),
    });
  };

  const handleCycle = (driverId: string, checkId: string) => {
    const key = getKey(driverId, checkId);
    const current = recordMap[key]?.status ?? "not_started";
    const next = statusCycle[(statusCycle.indexOf(current) + 1) % statusCycle.length];

    if (next === "blocked") {
      setBlockedPrompt({ driverId, checkId, status: next });
      setBlockedReason(blockedReasons[0]);
      setBlockedNote("");
      return;
    }

    if (next === "not_started") {
      const hasNote = Boolean(recordMap[key]?.note);
      if (hasNote && !window.confirm("Clear note and reset this cell?")) return;
      handleUpdate(driverId, checkId, next, null, null);
      return;
    }

    handleUpdate(driverId, checkId, next);
  };

  const handleBlockedSave = () => {
    if (!blockedPrompt) return;
    handleUpdate(
      blockedPrompt.driverId,
      blockedPrompt.checkId,
      "blocked",
      blockedNote,
      blockedReason
    );
    setBlockedPrompt(null);
  };

  const filteredStatus = (record: DailyCheckRecord | undefined) => {
    if (statusFilter === "All") return true;
    if (statusFilter === "Show only Blocked") return record?.status === "blocked";
    if (statusFilter === "Show only Not Done") return record?.status !== "done";
    return true;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-6 border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Dispatch Daily Checklist</h1>
            <p className="text-sm text-neutral-600">
              Rapid touchpoints with timestamps, no status clutter.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
            />
            <a
              href="/exceptions"
              className="rounded-xl border border-ink px-3 py-2 text-sm"
            >
              Exceptions
            </a>
            <a
              href="/manage"
              className="rounded-xl border border-ink px-3 py-2 text-sm"
            >
              Manage
            </a>
            <a
              href="/changes"
              className="rounded-xl border border-ink px-3 py-2 text-sm"
            >
              Recent Changes
            </a>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <select
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
          >
            <option>All</option>
            {groupOrder.map((group) => (
              <option key={group}>{group}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
          >
            <option>All</option>
            <option>Show only Blocked</option>
            <option>Show only Not Done</option>
          </select>
          <input
            type="search"
            placeholder="Search driver"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
          />
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="min-w-[1200px]">
          <div className="sticky top-0 z-10 grid grid-cols-[280px_1fr] bg-sand">
            <div className="p-3 border-b border-neutral-200 bg-sand font-semibold">
              Driver
            </div>
            <div className="overflow-auto">
              <div
                className="grid"
                style={{ gridTemplateColumns: `repeat(${checks.length}, minmax(140px, 1fr))` }}
              >
                {checksByBlock.map(({ block, checks: blockChecks }) => (
                  <div
                    key={block}
                    className="p-2 border-b border-neutral-200 bg-clay/70 text-xs uppercase tracking-[0.2em]"
                    style={{ gridColumn: `span ${Math.max(blockChecks.length, 1)}` }}
                  >
                    {block}
                  </div>
                ))}
                {checks.map((check) => (
                  <div
                    key={check.id}
                    className="p-3 border-b border-neutral-200 bg-white/80 text-sm font-semibold flex items-center justify-between"
                  >
                    <span>{check.displayName}</span>
                    <button
                      onClick={() => setInstructionPanel(check)}
                      className="text-xs text-neutral-500"
                    >
                      i
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {groupedDrivers.map(({ group, drivers }) => (
            <div key={group}>
              <div className="sticky top-[72px] z-10 bg-clay/60 px-3 py-2 text-xs uppercase tracking-[0.2em]">
                {group}
              </div>
              {drivers.map((driver) => (
                <div key={driver.id} className="grid grid-cols-[280px_1fr] border-b border-neutral-200">
                  <div className="p-3 bg-white/70">
                    <div className="font-medium">{driver.name}</div>
                    {driver.truckNumber ? (
                      <div className="text-xs text-neutral-500">Truck {driver.truckNumber}</div>
                    ) : null}
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: `repeat(${checks.length}, minmax(140px, 1fr))` }}>
                    {checks.map((check) => {
                      const key = getKey(driver.id, check.id);
                      const record = recordMap[key];
                      if (!filteredStatus(record)) {
                        return <div key={key} className="border-r border-neutral-100" />;
                      }
                      return (
                        <div
                          key={key}
                          id={`cell-${key}`}
                          className={clsx(
                            "relative flex items-center justify-center border-r border-neutral-100 p-2",
                            statusColors[record?.status ?? "not_started"]
                          )}
                        >
                          <button
                            className="absolute inset-0"
                            onClick={() => handleCycle(driver.id, check.id)}
                            aria-label="toggle"
                          />
                          {record?.note ? (
                            <button
                              className="relative z-10 rounded-full bg-white/80 px-2 py-1 text-[10px]"
                              onClick={(event) => {
                                event.stopPropagation();
                                setNotePanel(record);
                              }}
                            >
                              note
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>

      {blockedPrompt ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Blocked reason</h2>
              <p className="text-sm text-neutral-500">
                Capture the reason so follow-up is clear.
              </p>
            </div>
            <select
              value={blockedReason}
              onChange={(event) => setBlockedReason(event.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2"
            >
              {blockedReasons.map((reason) => (
                <option key={reason}>{reason}</option>
              ))}
            </select>
            <textarea
              value={blockedNote}
              onChange={(event) => setBlockedNote(event.target.value)}
              placeholder="Optional note"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBlockedPrompt(null)}
                className="rounded-xl border border-neutral-300 px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockedSave}
                className="rounded-xl bg-ember text-white px-3 py-2 text-sm"
              >
                Save blocked
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {notePanel ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-end">
          <div className="bg-white w-full max-w-md h-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Note</h2>
              <button
                onClick={() => setNotePanel(null)}
                className="text-sm text-neutral-500"
              >
                Close
              </button>
            </div>
            <div className="text-sm text-neutral-500">Blocked reason</div>
            <select
              value={notePanel.blockedReason ?? blockedReasons[0]}
              onChange={(event) =>
                setNotePanel((prev) =>
                  prev ? { ...prev, blockedReason: event.target.value } : prev
                )
              }
              className="w-full rounded-xl border border-neutral-200 px-3 py-2"
            >
              {blockedReasons.map((reason) => (
                <option key={reason}>{reason}</option>
              ))}
            </select>
            <textarea
              value={notePanel.note ?? ""}
              onChange={(event) =>
                setNotePanel((prev) =>
                  prev ? { ...prev, note: event.target.value } : prev
                )
              }
              className="w-full rounded-xl border border-neutral-200 px-3 py-2"
              rows={6}
            />
            <button
              onClick={() => {
                handleUpdate(
                  notePanel.driverId,
                  notePanel.checkId,
                  notePanel.status,
                  notePanel.note ?? null,
                  notePanel.blockedReason ?? null
                );
                setNotePanel(null);
              }}
              className="rounded-xl bg-ink text-sand px-3 py-2 text-sm"
            >
              Save note
            </button>
          </div>
        </div>
      ) : null}

      {instructionPanel ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{instructionPanel.displayName}</h2>
              <button
                onClick={() => setInstructionPanel(null)}
                className="text-sm text-neutral-500"
              >
                Close
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-neutral-700">
              {instructionPanel.instructionText || "No instructions yet."}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
