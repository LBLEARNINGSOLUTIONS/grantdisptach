import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import type { RecordStatus } from "@/app/lib/types";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { date, driverId, checkId, status, blockedReason, note } = body;

  if (!date || !driverId || !checkId || !status) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const now = new Date();
  const existing = await prisma.dailyCheckRecord.findUnique({
    where: {
      date_driverId_checkId: {
        date: new Date(date),
        driverId,
        checkId,
      },
    },
  });

  const resetFields =
    status === "not_started"
      ? { startedAt: null, completedAt: null, blockedReason: null, note: null }
      : {};

  const startedAt =
    status === "in_progress"
      ? existing?.startedAt ?? now
      : status === "not_started"
        ? null
        : existing?.startedAt ?? null;
  const completedAt =
    status === "done"
      ? existing?.completedAt ?? now
      : status === "not_started"
        ? null
        : existing?.completedAt ?? null;

  const record = await prisma.dailyCheckRecord.upsert({
    where: {
      date_driverId_checkId: {
        date: new Date(date),
        driverId,
        checkId,
      },
    },
    create: {
      date: new Date(date),
      driverId,
      checkId,
      status,
      startedAt,
      completedAt,
      updatedByUserId: session.user.id,
      blockedReason: blockedReason ?? null,
      note: note ?? null,
    },
    update: {
      status,
      ...resetFields,
      startedAt,
      completedAt,
      updatedByUserId: session.user.id,
      blockedReason: blockedReason ?? null,
      note: note ?? null,
    },
  });

  const action = existing ? "update" : "create";
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      entityType: "record",
      entityId: record.id,
      action,
      summary: `Record ${action} to ${status}`,
      diff: { status, blockedReason, note },
    },
  });

  return NextResponse.json({ record });
}
