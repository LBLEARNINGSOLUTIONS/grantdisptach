"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CheckColumn, DailyCheckRecord, Driver, RecordStatus } from "@/app/lib/types";
import { groupOrder, statusCycle, timeBlocks } from "@/app/lib/format";

const blockedReasons = [
  "No response",
  "Driver unavailable",
  "Equipment issue",
  "Other",
];

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const formatTime = (dateString: string | null) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

type OverviewResponse = {
  drivers: Driver[];
  checks: CheckColumn[];
  records: DailyCheckRecord[];
};

type RecordMap = Record<string, DailyCheckRecord>;

const getKey = (driverId: string, checkId: string) => `${driverId}-${checkId}`;

// Professional status styles
const statusStyles: Record<RecordStatus, { dot: string; text: string; label: string }> = {
  not_started: { dot: "bg-gray-400", text: "text-gray-500", label: "Not Started" },
  in_progress: { dot: "bg-blue-500", text: "text-blue-600", label: "In Progress" },
  done: { dot: "bg-green-600", text: "text-green-700", label: "Done" },
  blocked: { dot: "bg-red-600", text: "text-red-700", label: "Blocked" },
};

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
  }, [searchParams]);

  const groupedDrivers = useMemo(() => {
    const lowerQuery = query.toLowerCase();
    const filtered = drivers.filter((driver) => {
      if (groupFilter !== "All" && driver.group !== groupFilter) return false;
      if (query && !driver.name.toLowerCase().includes(lowerQuery)) return false;
      return driver.isActive;
    });

    return groupOrder.map((group) => ({
      group,
      drivers: filtered
        .filter((driver) => driver.group === group)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  }, [drivers, groupFilter, query]);

  const allChecks = useMemo(() => {
    return checks
      .filter((check) => check.isActive)
      .sort((a, b) => {
        const blockOrder = timeBlocks.indexOf(a.timeBlock) - timeBlocks.indexOf(b.timeBlock);
        if (blockOrder !== 0) return blockOrder;
        return a.sortOrder - b.sortOrder;
      });
  }, [checks]);

  const checksByBlock = useMemo(() => {
    return timeBlocks.map((block) => ({
      block,
      checks: allChecks.filter((check) => check.timeBlock === block),
    }));
  }, [allChecks]);

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

    const previousMap = recordMap;
    setRecordMap((prev) => ({ ...prev, [key]: optimistic }));

    try {
      const response = await fetch("/api/records", {
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

      if (!response.ok) {
        // Revert optimistic update on error
        setRecordMap(previousMap);
        alert("Failed to update record. Please try again.");
      }
    } catch (error) {
      // Revert optimistic update on network error
      setRecordMap(previousMap);
      alert("Network error. Please check your connection and try again.");
    }
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
    if (statusFilter === "Blocked") return record?.status === "blocked";
    if (statusFilter === "Not Done") return record?.status !== "done";
    return true;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-[#1E3A5F] text-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Daily Dispatch Checklist</h1>
            <p className="text-blue-200 text-sm">Driver status tracking</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="bg-white text-gray-900 px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
            <a href="/exceptions" className="px-4 py-2 bg-[#3B5998] hover:bg-[#4a6aa8] rounded text-sm font-medium transition">
              Exceptions
            </a>
            <a href="/manage" className="px-4 py-2 bg-[#3B5998] hover:bg-[#4a6aa8] rounded text-sm font-medium transition">
              Manage
            </a>
            <a href="/changes" className="px-4 py-2 bg-[#3B5998] hover:bg-[#4a6aa8] rounded text-sm font-medium transition">
              Changes
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-blue-200 text-sm">Group:</label>
            <select
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
              className="bg-white text-gray-900 px-3 py-1.5 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            >
              <option value="All">All Groups</option>
              {groupOrder.map((group) => (
                <option key={group} value={group}>{group.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-blue-200 text-sm">Status:</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="bg-white text-gray-900 px-3 py-1.5 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            >
              <option value="All">All Status</option>
              <option value="Blocked">Blocked Only</option>
              <option value="Not Done">Not Done</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-blue-200 text-sm">Search:</label>
            <input
              type="search"
              placeholder="Driver name..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="bg-white text-gray-900 px-3 py-1.5 rounded border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm w-48"
            />
          </div>
        </div>
      </header>

      {/* Main Content - Data Table */}
      <main className="flex-1 p-4 overflow-auto">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              {/* Table Header */}
              <thead>
                {/* Time Block Row */}
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th
                    rowSpan={2}
                    className="text-left px-4 py-2 font-semibold text-gray-700 border-r border-gray-200 sticky left-0 bg-gray-100 z-10"
                  >
                    Driver
                  </th>
                  <th
                    rowSpan={2}
                    className="text-center px-2 py-2 font-semibold text-gray-700 border-r border-gray-200"
                  >
                    Truck
                  </th>
                  {checksByBlock.map(({ block, checks: blockChecks }) => (
                    blockChecks.length > 0 ? (
                      <th
                        key={block}
                        colSpan={blockChecks.length}
                        className="text-center px-2 py-2 font-semibold text-gray-700 border-r border-gray-200 bg-gray-50"
                      >
                        {block}
                      </th>
                    ) : null
                  ))}
                </tr>
                {/* Column Names Row */}
                <tr className="bg-gray-50 border-b-2 border-gray-300">
                  {allChecks.map((check) => (
                    <th key={check.id} className="text-center px-2 py-2 font-medium text-gray-500 border-r border-gray-200">
                      <button
                        onClick={() => setInstructionPanel(check)}
                        className="hover:text-blue-600 hover:underline transition text-xs uppercase tracking-wide whitespace-nowrap overflow-hidden text-ellipsis block w-full"
                        title={`View instructions: ${check.displayName}`}
                      >
                        {check.displayName}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              {groupedDrivers.map(({ group, drivers: groupDrivers }) => {
                if (groupDrivers.length === 0) return null;

                return (
                  <tbody key={group}>
                      {/* Group Header */}
                      <tr className="bg-[#1E3A5F]">
                        <td
                          colSpan={2 + allChecks.length}
                          className="px-4 py-2 font-semibold text-white text-sm"
                        >
                          {group.replace("_", " ")}
                          <span className="ml-2 text-blue-200 font-normal">
                            ({groupDrivers.length} drivers)
                          </span>
                        </td>
                      </tr>
                      {/* Driver Rows */}
                      {groupDrivers.map((driver, idx) => (
                        <tr
                          key={driver.id}
                          className={`border-b border-gray-200 hover:bg-blue-50 transition ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          {/* Driver Name */}
                          <td className={`px-4 py-2 font-medium text-gray-900 border-r border-gray-200 sticky left-0 z-10 whitespace-nowrap ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                          } hover:bg-blue-50`}>
                            {driver.name}
                          </td>
                          {/* Truck Number */}
                          <td className="px-2 py-2 text-center border-r border-gray-200">
                            <span className="font-mono text-gray-700 text-sm">
                              {driver.truckNumber || "-"}
                            </span>
                          </td>
                          {/* Status Cells */}
                          {allChecks.map((check) => {
                            const key = getKey(driver.id, check.id);
                            const record = recordMap[key];
                            const status = record?.status ?? "not_started";
                            const style = statusStyles[status];
                            const showCell = filteredStatus(record);

                            if (!showCell) {
                              return <td key={key} className="px-2 py-2 border-r border-gray-200" />;
                            }

                            const timestamp = record?.updatedAt ? formatTime(record.updatedAt) : null;

                            return (
                              <td key={key} id={`cell-${key}`} className="px-2 py-2 text-center border-r border-gray-200">
                                <button
                                  onClick={() => handleCycle(driver.id, check.id)}
                                  className={`inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100 transition text-xs ${style.text}`}
                                  title={`Click to change status (${style.label})${timestamp ? ` - Updated ${timestamp}` : ''}`}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
                                    <span className="hidden sm:inline">{style.label}</span>
                                    {record?.note && (
                                      <span
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setNotePanel(record);
                                        }}
                                        className="w-4 h-4 bg-blue-500 rounded-full text-white text-[10px] flex items-center justify-center cursor-pointer hover:bg-blue-600"
                                        title="Has note - click to view"
                                      >
                                        !
                                      </span>
                                    )}
                                  </span>
                                  {timestamp && status !== 'not_started' && (
                                    <span className="text-[10px] text-gray-400">{timestamp}</span>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                );
              })}
            </table>
          </div>
        </div>
      </main>

      {/* Blocked Reason Modal */}
      {blockedPrompt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="bg-[#1E3A5F] px-6 py-4 rounded-t-lg">
              <h2 className="text-lg font-semibold text-white">Mark as Blocked</h2>
              <p className="text-blue-200 text-sm">Provide a reason for follow-up</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select
                  value={blockedReason}
                  onChange={(event) => setBlockedReason(event.target.value)}
                  className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                >
                  {blockedReasons.map((reason) => (
                    <option key={reason}>{reason}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <textarea
                  value={blockedNote}
                  onChange={(event) => setBlockedNote(event.target.value)}
                  placeholder="Add details..."
                  className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-sm"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setBlockedPrompt(null)}
                  className="flex-1 px-4 py-2 rounded border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlockedSave}
                  className="flex-1 px-4 py-2 rounded bg-red-600 text-white font-medium hover:bg-red-700 transition text-sm"
                >
                  Save Blocked
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note Panel Modal */}
      {notePanel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="bg-[#1E3A5F] px-6 py-4 rounded-t-lg flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Edit Note</h2>
                <p className="text-blue-200 text-sm">Update blocked reason and details</p>
              </div>
              <button
                onClick={() => setNotePanel(null)}
                className="w-8 h-8 rounded flex items-center justify-center text-white hover:bg-white/20 transition"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              {notePanel.status === "blocked" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blocked Reason</label>
                  <select
                    value={notePanel.blockedReason || blockedReasons[0]}
                    onChange={(event) =>
                      setNotePanel((prev) =>
                        prev ? { ...prev, blockedReason: event.target.value } : prev
                      )
                    }
                    className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  >
                    {blockedReasons.map((reason) => (
                      <option key={reason}>{reason}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={notePanel.note ?? ""}
                  onChange={(event) =>
                    setNotePanel((prev) =>
                      prev ? { ...prev, note: event.target.value } : prev
                    )
                  }
                  className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-sm"
                  rows={6}
                />
              </div>
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
                className="w-full px-4 py-2 rounded bg-[#1E3A5F] text-white font-medium hover:bg-[#2a4a73] transition text-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instruction Panel Modal */}
      {instructionPanel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="bg-[#1E3A5F] px-6 py-4 rounded-t-lg flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{instructionPanel.displayName}</h2>
                <p className="text-blue-200 text-sm">Instructions</p>
              </div>
              <button
                onClick={() => setInstructionPanel(null)}
                className="w-8 h-8 rounded flex items-center justify-center text-white hover:bg-white/20 transition"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded border border-gray-200 p-4 text-gray-700 text-sm whitespace-pre-wrap">
                {instructionPanel.instructionText || "No instructions available."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
