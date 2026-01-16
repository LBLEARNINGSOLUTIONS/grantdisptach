"use client";

import { useEffect, useMemo, useState } from "react";
import type { CheckColumn, Driver, DriverGroup, TimeBlock } from "@/app/lib/types";
import { groupOrder, timeBlocks } from "@/app/lib/format";

const defaultInstructions = "";

export default function ManageClient() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [checks, setChecks] = useState<CheckColumn[]>([]);
  const [dragDriverId, setDragDriverId] = useState<string | null>(null);
  const [dragCheckId, setDragCheckId] = useState<string | null>(null);
  const [newDriver, setNewDriver] = useState({
    name: "",
    truckNumber: "",
    group: "New Drivers" as DriverGroup,
  });
  const [newCheck, setNewCheck] = useState({
    displayName: "",
    timeBlock: "Morning" as TimeBlock,
    instructionText: defaultInstructions,
  });

  const load = async () => {
    const [driverRes, checkRes] = await Promise.all([
      fetch("/api/drivers"),
      fetch("/api/checks"),
    ]);
    const driverData = await driverRes.json();
    const checkData = await checkRes.json();
    setDrivers(driverData.drivers);
    setChecks(checkData.checks);
  };

  useEffect(() => {
    load();
  }, []);

  const groupedDrivers = useMemo(() => {
    return groupOrder.map((group) => ({
      group,
      drivers: drivers
        .filter((driver) => driver.group === group)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  }, [drivers]);

  const groupedChecks = useMemo(() => {
    return timeBlocks.map((block) => ({
      block,
      checks: checks
        .filter((check) => check.timeBlock === block && check.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  }, [checks]);

  const inactiveChecks = checks.filter((check) => !check.isActive);

  const createDriver = async () => {
    await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDriver),
    });
    setNewDriver({ name: "", truckNumber: "", group: "New Drivers" });
    await load();
  };

  const createCheck = async () => {
    await fetch("/api/checks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCheck),
    });
    setNewCheck({
      displayName: "",
      timeBlock: "Morning",
      instructionText: defaultInstructions,
    });
    await load();
  };

  const updateDriver = async (id: string, data: Partial<Driver>) => {
    await fetch(`/api/drivers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await load();
  };

  const updateCheck = async (id: string, data: Partial<CheckColumn>) => {
    await fetch(`/api/checks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await load();
  };

  const reorderList = <T extends { id: string }>(
    list: T[],
    sourceId: string,
    targetId: string
  ) => {
    const items = [...list];
    const fromIndex = items.findIndex((item) => item.id === sourceId);
    const toIndex = items.findIndex((item) => item.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return items;
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    return items;
  };

  const updateDriverOrder = async (group: DriverGroup, ordered: Driver[]) => {
    setDrivers((prev) =>
      prev.map((driver) => {
        const idx = ordered.findIndex((item) => item.id === driver.id);
        return idx === -1 ? driver : { ...driver, sortOrder: idx + 1 };
      })
    );
    await Promise.all(
      ordered.map((driver, index) =>
        fetch(`/api/drivers/${driver.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: index + 1 }),
        })
      )
    );
    await load();
  };

  const updateCheckOrder = async (block: TimeBlock, ordered: CheckColumn[]) => {
    setChecks((prev) =>
      prev.map((check) => {
        const idx = ordered.findIndex((item) => item.id === check.id);
        return idx === -1 ? check : { ...check, sortOrder: idx + 1 };
      })
    );
    await Promise.all(
      ordered.map((check, index) =>
        fetch(`/api/checks/${check.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: index + 1 }),
        })
      )
    );
    await load();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-[#1E3A5F] text-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Manage Settings</h1>
            <p className="text-blue-200 text-sm">Edit drivers, columns, and reorder by dragging</p>
          </div>
          <a href="/" className="px-4 py-2 bg-[#3B5998] hover:bg-[#4a6aa8] rounded text-sm font-medium transition">
            Back to Checklist
          </a>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        {/* Add New Section */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Add Driver Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">Add New Driver</h2>
            </div>
            <div className="p-4 space-y-3">
              <input
                value={newDriver.name}
                onChange={(event) => setNewDriver({ ...newDriver, name: event.target.value })}
                placeholder="Driver name"
                className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              />
              <input
                value={newDriver.truckNumber}
                onChange={(event) =>
                  setNewDriver({ ...newDriver, truckNumber: event.target.value })
                }
                placeholder="Truck number"
                className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-mono"
              />
              <select
                value={newDriver.group}
                onChange={(event) =>
                  setNewDriver({
                    ...newDriver,
                    group: event.target.value as DriverGroup,
                  })
                }
                className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              >
                {groupOrder.map((group) => (
                  <option key={group}>{group.replace("_", " ")}</option>
                ))}
              </select>
              <button
                onClick={createDriver}
                className="w-full px-4 py-2 rounded bg-[#1E3A5F] text-white font-medium hover:bg-[#2a4a73] transition text-sm"
              >
                Add Driver
              </button>
            </div>
          </div>

          {/* Add Column Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">Add New Column</h2>
            </div>
            <div className="p-4 space-y-3">
              <input
                value={newCheck.displayName}
                onChange={(event) => setNewCheck({ ...newCheck, displayName: event.target.value })}
                placeholder="Column name"
                className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              />
              <select
                value={newCheck.timeBlock}
                onChange={(event) =>
                  setNewCheck({ ...newCheck, timeBlock: event.target.value as TimeBlock })
                }
                className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              >
                {timeBlocks.map((block) => (
                  <option key={block}>{block}</option>
                ))}
              </select>
              <textarea
                value={newCheck.instructionText}
                onChange={(event) =>
                  setNewCheck({ ...newCheck, instructionText: event.target.value })
                }
                placeholder="Instructions (optional)"
                className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-sm"
                rows={2}
              />
              <button
                onClick={createCheck}
                className="w-full px-4 py-2 rounded bg-[#1E3A5F] text-white font-medium hover:bg-[#2a4a73] transition text-sm"
              >
                Add Column
              </button>
            </div>
          </div>
        </section>

        {/* Drivers by Group */}
        {groupedDrivers.map(({ group, drivers: groupDrivers }) => (
          <div key={group} className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="bg-[#1E3A5F] px-4 py-3">
              <h2 className="font-semibold text-white">{group.replace("_", " ")}</h2>
              <p className="text-blue-200 text-sm">{groupDrivers.length} drivers - drag to reorder</p>
            </div>
            <div className="divide-y divide-gray-200">
              {groupDrivers.map((driver, idx) => (
                <div
                  key={driver.id}
                  draggable
                  onDragStart={() => setDragDriverId(driver.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={async () => {
                    if (!dragDriverId || dragDriverId === driver.id) return;
                    const ordered = reorderList(groupDrivers, dragDriverId, driver.id);
                    await updateDriverOrder(group, ordered);
                    setDragDriverId(null);
                  }}
                  onDragEnd={() => setDragDriverId(null)}
                  className={`flex items-center gap-4 p-4 hover:bg-blue-50 transition cursor-move ${!driver.isActive ? "opacity-50 bg-gray-50" : ""}`}
                >
                  {/* Order Number */}
                  <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-sm flex-shrink-0">
                    {idx + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      value={driver.name}
                      onChange={(event) =>
                        setDrivers((prev) =>
                          prev.map((d) =>
                            d.id === driver.id ? { ...d, name: event.target.value } : d
                          )
                        )
                      }
                      className="px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                      placeholder="Name"
                    />
                    <input
                      value={driver.truckNumber ?? ""}
                      onChange={(event) =>
                        setDrivers((prev) =>
                          prev.map((d) =>
                            d.id === driver.id
                              ? { ...d, truckNumber: event.target.value }
                              : d
                          )
                        )
                      }
                      className="px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
                      placeholder="Truck #"
                    />
                    <select
                      value={driver.group}
                      onChange={(event) =>
                        updateDriver(driver.id, { group: event.target.value as DriverGroup })
                      }
                      className="px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                    >
                      {groupOrder.map((g) => (
                        <option key={g} value={g}>{g.replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => updateDriver(driver.id, driver)}
                      className="px-3 py-1.5 rounded bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2a4a73] transition"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => updateDriver(driver.id, { isActive: !driver.isActive })}
                      className={`px-3 py-1.5 rounded border text-sm font-medium transition ${
                        driver.isActive
                          ? "border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600"
                          : "border-green-500 text-green-600 hover:bg-green-50"
                      }`}
                    >
                      {driver.isActive ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              ))}
              {groupDrivers.length === 0 && (
                <p className="text-gray-400 text-center py-8 text-sm">No drivers in this group</p>
              )}
            </div>
          </div>
        ))}

        {/* Columns by Time Block */}
        {groupedChecks.map(({ block, checks: blockChecks }) => (
          <div key={block} className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="bg-[#3B5998] px-4 py-3">
              <h2 className="font-semibold text-white">{block} Columns</h2>
              <p className="text-blue-200 text-sm">{blockChecks.length} columns - drag to reorder</p>
            </div>
            <div className="divide-y divide-gray-200">
              {blockChecks.map((check, idx) => (
                <div
                  key={check.id}
                  draggable
                  onDragStart={() => setDragCheckId(check.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={async () => {
                    if (!dragCheckId || dragCheckId === check.id) return;
                    const ordered = reorderList(blockChecks, dragCheckId, check.id);
                    await updateCheckOrder(block, ordered);
                    setDragCheckId(null);
                  }}
                  onDragEnd={() => setDragCheckId(null)}
                  className="flex items-center gap-4 p-4 hover:bg-blue-50 transition cursor-move"
                >
                  {/* Order Number */}
                  <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm flex-shrink-0">
                    {idx + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={check.displayName}
                      onChange={(event) =>
                        setChecks((prev) =>
                          prev.map((c) =>
                            c.id === check.id ? { ...c, displayName: event.target.value } : c
                          )
                        )
                      }
                      className="px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                      placeholder="Display name"
                    />
                    <input
                      value={check.instructionText}
                      onChange={(event) =>
                        setChecks((prev) =>
                          prev.map((c) =>
                            c.id === check.id
                              ? { ...c, instructionText: event.target.value }
                              : c
                          )
                        )
                      }
                      className="px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-600"
                      placeholder="Instructions"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => updateCheck(check.id, check)}
                      className="px-3 py-1.5 rounded bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2a4a73] transition"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => updateCheck(check.id, { isActive: false })}
                      className="px-3 py-1.5 rounded border border-gray-300 text-gray-600 text-sm font-medium hover:border-red-400 hover:text-red-600 transition"
                    >
                      Hide
                    </button>
                  </div>
                </div>
              ))}
              {blockChecks.length === 0 && (
                <p className="text-gray-400 text-center py-8 text-sm">No columns in this time block</p>
              )}
            </div>
          </div>
        ))}

        {/* Hidden Columns */}
        {inactiveChecks.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="bg-gray-500 px-4 py-3">
              <h2 className="font-semibold text-white">Hidden Columns</h2>
              <p className="text-gray-200 text-sm">{inactiveChecks.length} hidden columns</p>
            </div>
            <div className="divide-y divide-gray-200">
              {inactiveChecks.map((check) => (
                <div
                  key={check.id}
                  className="flex items-center justify-between p-4 bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-600 text-sm">{check.displayName}</span>
                    <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-500 text-xs">
                      {check.timeBlock}
                    </span>
                  </div>
                  <button
                    onClick={() => updateCheck(check.id, { isActive: true })}
                    className="px-3 py-1.5 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
                  >
                    Show
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
