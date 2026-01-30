"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CheckColumn, DailyCheckRecord, Driver, RecordStatus, LiveDispatchChecklist } from "@/app/lib/types";
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
const statusStyles: Record<RecordStatus, {
  bg: string;
  hover: string;
  text: string;
  label: string
}> = {
  not_started: {
    bg: "bg-gray-300",
    hover: "hover:bg-gray-400",
    text: "text-white",
    label: "Not Started"
  },
  in_progress: {
    bg: "bg-yellow-500",
    hover: "hover:bg-yellow-600",
    text: "text-white",
    label: "In Progress"
  },
  done: {
    bg: "bg-green-600",
    hover: "hover:bg-green-700",
    text: "text-white",
    label: "Done"
  },
  blocked: {
    bg: "bg-red-600",
    hover: "hover:bg-red-700",
    text: "text-white",
    label: "Blocked"
  },
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
  const [donePrompt, setDonePrompt] = useState<{
    driverId: string;
    checkId: string;
  } | null>(null);
  const [doneNote, setDoneNote] = useState("");
  const [notePanel, setNotePanel] = useState<DailyCheckRecord | null>(null);
  const [instructionPanel, setInstructionPanel] = useState<CheckColumn | null>(null);
  const [freeTextInputs, setFreeTextInputs] = useState<Record<string, string>>({});
  const [ldPrompt, setLdPrompt] = useState<{
    driverId: string;
    checkId: string;
    currentActive: boolean;
    currentChecklist: LiveDispatchChecklist | null;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/overview?date=${selectedDate}`);
      const data: OverviewResponse = await res.json();
      setDrivers(data.drivers);
      setChecks(data.checks);
      const map: RecordMap = {};
      const textInputs: Record<string, string> = {};
      data.records.forEach((record) => {
        const key = getKey(record.driverId, record.checkId);
        map[key] = record;
        if (record.freeTextValue) {
          textInputs[key] = record.freeTextValue;
        }
      });
      setRecordMap(map);
      setFreeTextInputs(textInputs);
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
      updatedByUser: existing?.updatedByUser ?? null,
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

  const handleFreeTextUpdate = async (
    driverId: string,
    checkId: string,
    value: string
  ) => {
    const key = getKey(driverId, checkId);
    const existing = recordMap[key];

    const optimistic: DailyCheckRecord = {
      id: existing?.id ?? `temp-${key}`,
      date: selectedDate,
      driverId,
      checkId,
      status: "not_started",
      startedAt: null,
      completedAt: null,
      updatedAt: new Date().toISOString(),
      updatedByUserId: existing?.updatedByUserId ?? "",
      updatedByUser: existing?.updatedByUser ?? null,
      blockedReason: null,
      note: null,
      freeTextValue: value,
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
          freeTextValue: value,
          status: "not_started",
        }),
      });

      if (!response.ok) {
        setRecordMap(previousMap);
        alert("Failed to update record. Please try again.");
      }
    } catch (error) {
      setRecordMap(previousMap);
      alert("Network error. Please check your connection and try again.");
    }
  };

  const handleFreeTextChange = (driverId: string, checkId: string, value: string) => {
    const key = getKey(driverId, checkId);
    setFreeTextInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleFreeTextBlur = (driverId: string, checkId: string) => {
    const key = getKey(driverId, checkId);
    const value = freeTextInputs[key] ?? "";
    const existing = recordMap[key]?.freeTextValue ?? "";

    if (value !== existing) {
      handleFreeTextUpdate(driverId, checkId, value);
    }
  };

  const handleFreeTextKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    driverId: string,
    checkId: string
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const handleLiveDispatchToggle = async (
    driverId: string,
    checkId: string,
    active: boolean
  ) => {
    const key = getKey(driverId, checkId);
    const existing = recordMap[key];

    const optimistic: DailyCheckRecord = {
      id: existing?.id ?? `temp-${key}`,
      date: selectedDate,
      driverId,
      checkId,
      status: "not_started",
      startedAt: null,
      completedAt: null,
      updatedAt: new Date().toISOString(),
      updatedByUserId: existing?.updatedByUserId ?? "",
      updatedByUser: existing?.updatedByUser ?? null,
      blockedReason: null,
      note: null,
      freeTextValue: null,
      liveDispatchActive: active,
      liveDispatchChecklist: active ? (existing?.liveDispatchChecklist ?? null) : null,
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
          liveDispatchActive: active,
          liveDispatchChecklist: active ? (existing?.liveDispatchChecklist ?? null) : null,
          status: "not_started",
        }),
      });

      if (!response.ok) {
        setRecordMap(previousMap);
        alert("Failed to update Live Dispatch. Please try again.");
      }
    } catch (error) {
      setRecordMap(previousMap);
      alert("Network error. Please check your connection and try again.");
    }
  };

  const handleLiveDispatchUpdate = async (
    driverId: string,
    checkId: string,
    checklist: LiveDispatchChecklist
  ) => {
    const key = getKey(driverId, checkId);
    const existing = recordMap[key];

    const hasAnyChecked = Object.values(checklist).some(v => v === true);

    const optimistic: DailyCheckRecord = {
      id: existing?.id ?? `temp-${key}`,
      date: selectedDate,
      driverId,
      checkId,
      status: "not_started",
      startedAt: null,
      completedAt: null,
      updatedAt: new Date().toISOString(),
      updatedByUserId: existing?.updatedByUserId ?? "",
      updatedByUser: existing?.updatedByUser ?? null,
      blockedReason: null,
      note: null,
      freeTextValue: null,
      liveDispatchActive: hasAnyChecked || existing?.liveDispatchActive || false,
      liveDispatchChecklist: checklist,
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
          liveDispatchActive: hasAnyChecked || existing?.liveDispatchActive || false,
          liveDispatchChecklist: checklist,
          status: "not_started",
        }),
      });

      if (!response.ok) {
        setRecordMap(previousMap);
        alert("Failed to update Live Dispatch. Please try again.");
      }
    } catch (error) {
      setRecordMap(previousMap);
      alert("Network error. Please check your connection and try again.");
    }

    setLdPrompt(null);
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

    if (next === "done") {
      setDonePrompt({ driverId, checkId });
      setDoneNote(recordMap[key]?.note ?? "");
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

  const handleDoneSave = () => {
    if (!donePrompt) return;
    handleUpdate(
      donePrompt.driverId,
      donePrompt.checkId,
      "done",
      doneNote || null,
      null
    );
    setDonePrompt(null);
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
            <a href="/users" className="px-4 py-2 bg-[#3B5998] hover:bg-[#4a6aa8] rounded text-sm font-medium transition">
              Users
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
      <main className="flex-1 p-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-240px)]">
            <table className="w-full border-collapse text-sm">
              {/* Table Header */}
              <thead>
                {/* Time Block Row */}
                <tr className="sticky top-0 bg-gray-100 z-[21]">
                  <th
                    rowSpan={2}
                    className="text-left px-4 py-2 font-semibold text-gray-700 border-r border-gray-200 sticky left-0 bg-gray-100 z-30"
                  >
                    Driver
                  </th>
                  <th
                    rowSpan={2}
                    className="text-center px-2 py-2 font-semibold text-gray-700 border-r border-gray-200 bg-gray-100"
                  >
                    Truck
                  </th>
                  {checksByBlock.map(({ block, checks: blockChecks }) => (
                    blockChecks.length > 0 ? (
                      <th
                        key={block}
                        colSpan={blockChecks.length}
                        className="text-center px-2 py-2 font-semibold text-gray-700 border-r border-gray-200 bg-gray-100"
                      >
                        {block}
                      </th>
                    ) : null
                  ))}
                </tr>
                {/* Column Names Row */}
                <tr className="sticky top-[37px] bg-gray-50 border-b-2 border-gray-300 z-20">
                  {allChecks.map((check) => (
                    <th key={check.id} className="text-center px-2 py-2 font-medium text-gray-500 border-r border-gray-200 bg-gray-50">
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

                            // Handle free-text input columns
                            if (check.inputType === "freeText") {
                              const currentValue = freeTextInputs[key] ?? record?.freeTextValue ?? "";
                              const timestamp = record?.updatedAt ? formatTime(record.updatedAt) : null;

                              return (
                                <td key={key} id={`cell-${key}`} className="px-2 py-2 text-center border-r border-gray-200">
                                  <div className="flex flex-col gap-0.5">
                                    <input
                                      type="text"
                                      value={currentValue}
                                      onChange={(e) => handleFreeTextChange(driver.id, check.id, e.target.value)}
                                      onBlur={() => handleFreeTextBlur(driver.id, check.id)}
                                      onKeyDown={(e) => handleFreeTextKeyDown(e, driver.id, check.id)}
                                      placeholder=""
                                      title={check.instructionText}
                                      className="w-full px-2 py-1 text-xs text-center border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                    />
                                    {timestamp && record?.updatedByUser?.name && (
                                      <span className="text-[9px] text-gray-500">
                                        {timestamp} - {record.updatedByUser.name}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            }

                            // Handle Live Dispatch columns
                            if (check.inputType === "liveDispatch") {
                              const isActive = record?.liveDispatchActive || false;
                              const checklist = record?.liveDispatchChecklist || null;
                              const timestamp = record?.updatedAt ? formatTime(record.updatedAt) : null;

                              let displayText = "";
                              if (isActive) {
                                const checks = checklist as LiveDispatchChecklist | null;
                                if (checks && Object.values(checks).some(v => v)) {
                                  const initials: string[] = [];
                                  if (checks.tarping) initials.push("T");
                                  if (checks.fuel_stops) initials.push("F");
                                  if (checks.routing) initials.push("R");
                                  if (checks.special_requirements) initials.push("S");
                                  displayText = initials.length > 0 ? `LD (${initials.join(",")})` : "LD";
                                } else {
                                  displayText = "LD";
                                }
                              }

                              const bgColor = isActive ? "bg-yellow-100 hover:bg-yellow-200" : "bg-gray-50 hover:bg-gray-100";
                              const textColor = isActive ? "text-yellow-900" : "text-gray-500";

                              return (
                                <td key={key} id={`cell-${key}`} className="px-2 py-2 text-center border-r border-gray-200">
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => handleLiveDispatchToggle(driver.id, check.id, !isActive)}
                                        className={`px-2 py-1 rounded text-xs font-medium transition ${bgColor} ${textColor}`}
                                        title={`Live Dispatch: ${isActive ? 'Active' : 'Inactive'} - Click to toggle`}
                                      >
                                        {displayText || "—"}
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setLdPrompt({
                                            driverId: driver.id,
                                            checkId: check.id,
                                            currentActive: isActive,
                                            currentChecklist: checklist as LiveDispatchChecklist | null,
                                          });
                                        }}
                                        className="w-5 h-5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full flex items-center justify-center transition"
                                        title="Edit Live Dispatch checklist"
                                      >
                                        ⚙
                                      </button>
                                    </div>
                                    {timestamp && record?.updatedByUser?.name && (
                                      <span className="text-[9px] text-gray-500">
                                        {timestamp} - {record.updatedByUser.name}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            }

                            // Handle standard status columns (existing code)
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
                                  className={`inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded transition text-xs ${style.bg} ${style.hover} ${style.text}`}
                                  title={`Click to change status (${style.label})${timestamp ? ` - Updated ${timestamp}${record?.updatedByUser?.name ? ` by ${record.updatedByUser.name}` : ''}` : ''}`}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="hidden sm:inline">{style.label}</span>
                                    {record?.note && (
                                      <span
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setNotePanel(record);
                                        }}
                                        className="w-4 h-4 bg-white border border-blue-600 rounded-full text-blue-600 text-[10px] font-semibold flex items-center justify-center cursor-pointer hover:bg-blue-50"
                                        title="Has note - click to view"
                                      >
                                        !
                                      </span>
                                    )}
                                  </span>
                                  {timestamp && status !== 'not_started' && (
                                    <span className="text-[10px] text-white/70">
                                      {timestamp}
                                      {record?.updatedByUser?.name && (
                                        <> - {record.updatedByUser.name}</>
                                      )}
                                    </span>
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

      {/* Done Note Modal */}
      {donePrompt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="bg-[#1E3A5F] px-6 py-4 rounded-t-lg">
              <h2 className="text-lg font-semibold text-white">Mark as Done</h2>
              <p className="text-blue-200 text-sm">What was communicated with the driver?</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Communication Notes</label>
                <textarea
                  value={doneNote}
                  onChange={(event) => setDoneNote(event.target.value)}
                  placeholder="Enter details about what was communicated with the driver..."
                  className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-sm"
                  rows={5}
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDonePrompt(null)}
                  className="flex-1 px-4 py-2 rounded border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDoneSave}
                  className="flex-1 px-4 py-2 rounded bg-green-600 text-white font-medium hover:bg-green-700 transition text-sm"
                >
                  Mark as Done
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

      {/* Live Dispatch Checklist Modal */}
      {ldPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Live Dispatch Checklist</h3>

            <div className="space-y-3 mb-6">
              {[
                { key: "tarping", label: "Tarping", initial: "T" },
                { key: "fuel_stops", label: "Fuel Stops", initial: "F" },
                { key: "routing", label: "Routing", initial: "R" },
                { key: "special_requirements", label: "Special Requirements", initial: "S" },
              ].map(({ key, label, initial }) => {
                const currentChecklist = ldPrompt.currentChecklist || {};
                const isChecked = currentChecklist[key as keyof LiveDispatchChecklist] || false;

                return (
                  <label
                    key={key}
                    className="flex items-center gap-3 p-3 rounded hover:bg-gray-50 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const newChecklist = {
                          ...ldPrompt.currentChecklist,
                          [key]: e.target.checked,
                        };
                        setLdPrompt({
                          ...ldPrompt,
                          currentChecklist: newChecklist,
                        });
                      }}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="flex-1 text-sm font-medium">{label}</span>
                    <span className="text-xs text-gray-500 font-mono">({initial})</span>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setLdPrompt(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleLiveDispatchUpdate(
                    ldPrompt.driverId,
                    ldPrompt.checkId,
                    ldPrompt.currentChecklist || {}
                  );
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
