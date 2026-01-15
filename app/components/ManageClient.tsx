"use client";

import { useEffect, useMemo, useState } from "react";
import type { CheckColumn, Driver, DriverGroup, TimeBlock } from "@/app/lib/types";
import { groupOrder, timeBlocks } from "@/app/lib/format";

const defaultInstructions = "Do this:\n-\n\nDone means:\n-";

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
    <div className="min-h-screen p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Manage Drivers + Columns</h1>
          <p className="text-sm text-neutral-600">No deletes. Deactivate to hide.</p>
        </div>
        <a href="/" className="rounded-xl border border-ink px-3 py-2 text-sm">
          Back to Today
        </a>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white/80 p-5 shadow space-y-4">
          <h2 className="text-lg font-semibold">Add Driver</h2>
          <div className="grid gap-3">
            <input
              value={newDriver.name}
              onChange={(event) => setNewDriver({ ...newDriver, name: event.target.value })}
              placeholder="Driver name"
              className="rounded-xl border border-neutral-200 px-3 py-2"
            />
            <input
              value={newDriver.truckNumber}
              onChange={(event) =>
                setNewDriver({ ...newDriver, truckNumber: event.target.value })
              }
              placeholder="Truck number"
              className="rounded-xl border border-neutral-200 px-3 py-2"
            />
            <select
              value={newDriver.group}
              onChange={(event) =>
                setNewDriver({
                  ...newDriver,
                  group: event.target.value as DriverGroup,
                })
              }
              className="rounded-xl border border-neutral-200 px-3 py-2"
            >
              {groupOrder.map((group) => (
                <option key={group}>{group}</option>
              ))}
            </select>
            <button
              onClick={createDriver}
              className="rounded-xl bg-ink text-sand px-3 py-2 text-sm"
            >
              Add driver
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-white/80 p-5 shadow space-y-4">
          <h2 className="text-lg font-semibold">Add Column</h2>
          <div className="grid gap-3">
            <input
              value={newCheck.displayName}
              onChange={(event) => setNewCheck({ ...newCheck, displayName: event.target.value })}
              placeholder="Column name"
              className="rounded-xl border border-neutral-200 px-3 py-2"
            />
            <select
              value={newCheck.timeBlock}
              onChange={(event) =>
                setNewCheck({ ...newCheck, timeBlock: event.target.value as TimeBlock })
              }
              className="rounded-xl border border-neutral-200 px-3 py-2"
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
              className="rounded-xl border border-neutral-200 px-3 py-2"
              rows={4}
            />
            <button
              onClick={createCheck}
              className="rounded-xl bg-ink text-sand px-3 py-2 text-sm"
            >
              Add column
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white/80 p-5 shadow space-y-6">
          <h2 className="text-lg font-semibold">Drivers</h2>
          {groupedDrivers.map(({ group, drivers }) => (
            <div key={group} className="space-y-2">
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                {group}
              </div>
              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  draggable
                  onDragStart={() => setDragDriverId(driver.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={async () => {
                    if (!dragDriverId || dragDriverId === driver.id) return;
                    const ordered = reorderList(drivers, dragDriverId, driver.id);
                    await updateDriverOrder(group, ordered);
                    setDragDriverId(null);
                  }}
                  onDragEnd={() => setDragDriverId(null)}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-200 p-3"
                >
                  <div>
                    <input
                      value={driver.name}
                      onChange={(event) =>
                        setDrivers((prev) =>
                          prev.map((d) =>
                            d.id === driver.id ? { ...d, name: event.target.value } : d
                          )
                        )
                      }
                      className="font-medium bg-transparent"
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
                      placeholder="Truck"
                      className="text-xs text-neutral-500 bg-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateDriver(driver.id, { isActive: !driver.isActive })}
                      className="text-xs rounded-xl border border-neutral-200 px-2 py-1"
                    >
                      {driver.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                    <button
                      onClick={() => updateDriver(driver.id, driver)}
                      className="text-xs rounded-xl bg-ink text-sand px-2 py-1"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-white/80 p-5 shadow space-y-6">
          <h2 className="text-lg font-semibold">Columns</h2>
          {groupedChecks.map(({ block, checks }) => (
            <div key={block} className="space-y-2">
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                {block}
              </div>
              {checks.map((check) => (
                <div
                  key={check.id}
                  draggable
                  onDragStart={() => setDragCheckId(check.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={async () => {
                    if (!dragCheckId || dragCheckId === check.id) return;
                    const ordered = reorderList(checks, dragCheckId, check.id);
                    await updateCheckOrder(block, ordered);
                    setDragCheckId(null);
                  }}
                  onDragEnd={() => setDragCheckId(null)}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-200 p-3"
                >
                  <div className="space-y-1">
                    <input
                      value={check.displayName}
                      onChange={(event) =>
                        setChecks((prev) =>
                          prev.map((c) =>
                            c.id === check.id ? { ...c, displayName: event.target.value } : c
                          )
                        )
                      }
                      className="font-medium bg-transparent"
                    />
                    <textarea
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
                      className="text-xs text-neutral-600 bg-transparent w-full"
                      rows={2}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={check.timeBlock}
                      onChange={(event) => {
                        const nextBlock = event.target.value as TimeBlock;
                        if (
                          nextBlock !== check.timeBlock &&
                          !window.confirm(\"Move this column to a different time block?\")
                        ) {
                          return;
                        }
                        updateCheck(check.id, { timeBlock: nextBlock });
                      }}
                      className="text-xs rounded-xl border border-neutral-200 px-2 py-1"
                    >
                      {timeBlocks.map((blockOption) => (
                        <option key={blockOption}>{blockOption}</option>
                      ))}
                    </select>
                    {check.columnType === "temporary" ? (
                      <button
                        onClick={() =>
                          updateCheck(check.id, { columnType: "standard", expiresAt: null })
                        }
                        className="text-xs rounded-xl border border-neutral-200 px-2 py-1"
                      >
                        Promote
                      </button>
                    ) : null}
                    <button
                      onClick={() => updateCheck(check.id, { isActive: false })}
                      className="text-xs rounded-xl border border-neutral-200 px-2 py-1"
                    >
                      Deactivate
                    </button>
                    <button
                      onClick={() => updateCheck(check.id, check)}
                      className="text-xs rounded-xl bg-ink text-sand px-2 py-1"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white/80 p-5 shadow space-y-3">
        <h2 className="text-lg font-semibold">Inactive Columns</h2>
        {inactiveChecks.length === 0 ? (
          <p className="text-sm text-neutral-500">No inactive columns.</p>
        ) : (
          inactiveChecks.map((check) => (
            <div key={check.id} className="flex items-center justify-between">
              <div>{check.displayName}</div>
              <button
                onClick={() => updateCheck(check.id, { isActive: true })}
                className="text-xs rounded-xl border border-neutral-200 px-2 py-1"
              >
                Reactivate
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
