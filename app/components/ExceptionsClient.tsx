"use client";

import { useEffect, useMemo, useState } from "react";
import type { CheckColumn, DailyCheckRecord, Driver } from "@/app/lib/types";
import { timeBlocks } from "@/app/lib/format";

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

export default function ExceptionsClient() {
  const [selectedDate, setSelectedDate] = useState(formatDateInput(new Date()));
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [checks, setChecks] = useState<CheckColumn[]>([]);
  const [records, setRecords] = useState<DailyCheckRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/overview?date=${selectedDate}`);
      const data = await res.json();
      setDrivers(data.drivers);
      setChecks(data.checks);
      setRecords(data.records);
    };
    load();
  }, [selectedDate]);

  const driverMap = useMemo(() => {
    return Object.fromEntries(drivers.map((driver) => [driver.id, driver]));
  }, [drivers]);

  const checkMap = useMemo(() => {
    return Object.fromEntries(checks.map((check) => [check.id, check]));
  }, [checks]);

  const recordMap = useMemo(() => {
    return Object.fromEntries(
      records.map((record) => [`${record.driverId}-${record.checkId}`, record])
    );
  }, [records]);

  const blocked = records.filter((record) => record.status === "blocked");

  const notDone = useMemo(() => {
    const list: DailyCheckRecord[] = [];
    drivers.forEach((driver) => {
      checks.forEach((check) => {
        const key = `${driver.id}-${check.id}`;
        const record =
          recordMap[key] ??
          ({
            id: key,
            date: selectedDate,
            driverId: driver.id,
            checkId: check.id,
            status: "not_started",
            updatedAt: selectedDate,
            updatedByUserId: "",
          } as DailyCheckRecord);
        if (record.status !== "done") list.push(record);
      });
    });
    return list;
  }, [drivers, checks, recordMap, selectedDate]);

  return (
    <div className="min-h-screen p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Exceptions</h1>
          <p className="text-sm text-neutral-600">Blocked and not-done follow-ups.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
          />
          <a href="/" className="rounded-xl border border-ink px-3 py-2 text-sm">
            Back to Today
          </a>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white/80 p-5 shadow">
          <h2 className="text-lg font-semibold">Blocked</h2>
          <div className="mt-4 space-y-3">
            {blocked.length === 0 ? (
              <p className="text-sm text-neutral-500">No blocked items.</p>
            ) : (
              blocked.map((record) => (
                <div key={record.id} className="border-b border-neutral-100 pb-3">
                  <div className="font-medium">
                    {driverMap[record.driverId]?.name} · {checkMap[record.checkId]?.displayName}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {checkMap[record.checkId]?.timeBlock} · {record.blockedReason || "No reason"}
                  </div>
                  {record.note ? (
                    <div className="text-sm text-neutral-700">{record.note}</div>
                  ) : null}
                  <a
                    href={`/?date=${selectedDate}&focus=${record.driverId}-${record.checkId}`}
                    className="text-xs text-cool"
                  >
                    Jump to grid
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white/80 p-5 shadow">
          <h2 className="text-lg font-semibold">Not Done</h2>
          <div className="mt-4 space-y-3">
            {notDone.length === 0 ? (
              <p className="text-sm text-neutral-500">All caught up.</p>
            ) : (
              notDone.map((record) => (
                <div key={record.id} className="border-b border-neutral-100 pb-3">
                  <div className="font-medium">
                    {driverMap[record.driverId]?.name} · {checkMap[record.checkId]?.displayName}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {checkMap[record.checkId]?.timeBlock} · {record.status}
                  </div>
                  <a
                    href={`/?date=${selectedDate}&focus=${record.driverId}-${record.checkId}`}
                    className="text-xs text-cool"
                  >
                    Jump to grid
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white/80 p-5 shadow">
        <h2 className="text-lg font-semibold">Time Block Summary</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {timeBlocks.map((block) => {
            const blockedCount = blocked.filter(
              (record) => checkMap[record.checkId]?.timeBlock === block
            ).length;
            const notDoneCount = notDone.filter(
              (record) => checkMap[record.checkId]?.timeBlock === block
            ).length;
            return (
              <div key={block} className="rounded-2xl border border-neutral-200 p-4">
                <div className="text-sm uppercase tracking-wide text-neutral-500">{block}</div>
                <div className="mt-2 text-2xl font-semibold">{blockedCount} blocked</div>
                <div className="text-sm text-neutral-600">{notDoneCount} not done</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
