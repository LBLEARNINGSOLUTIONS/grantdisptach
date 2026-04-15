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

  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    console.error("[/api/records] invalid JSON body", err);
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { date, driverId, checkId, status, blockedReason, note, freeTextValue, liveDispatchActive, liveDispatchChecklist } = body;

  if (!date || !driverId || !checkId) {
    return NextResponse.json({ error: "missing fields", details: { date, driverId, checkId } }, { status: 400 });
  }

  try {
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
        ? { startedAt: null, completedAt: null, blockedReason: null, note: null, freeTextValue: null, liveDispatchActive: null, liveDispatchChecklist: null }
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
        status: status ?? "not_started",
        startedAt,
        completedAt,
        updatedByUserId: session.user.id,
        blockedReason: blockedReason ?? null,
        note: note ?? null,
        freeTextValue: freeTextValue ?? null,
        liveDispatchActive: liveDispatchActive ?? null,
        liveDispatchChecklist: liveDispatchChecklist ?? null,
      },
      update: {
        status: status ?? undefined,
        ...resetFields,
        startedAt,
        completedAt,
        updatedByUserId: session.user.id,
        blockedReason: blockedReason ?? null,
        note: note ?? null,
        freeTextValue: freeTextValue ?? null,
        liveDispatchActive: liveDispatchActive ?? undefined,
        liveDispatchChecklist: liveDispatchChecklist ?? undefined,
      },
    });

    const action = existing ? "update" : "create";
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          entityType: "record",
          entityId: record.id,
          action,
          summary: `Record ${action} to ${status || 'free-text'}`,
          diff: { status, blockedReason, note, freeTextValue, liveDispatchActive, liveDispatchChecklist },
        },
      });
    } catch (auditErr) {
      // Don't fail the save if audit logging fails - just log it server-side.
      console.error("[/api/records] audit log failed", auditErr);
    }

    return NextResponse.json({ record });
  } catch (err: any) {
    console.error("[/api/records] save failed", {
      message: err?.message,
      code: err?.code,
      meta: err?.meta,
      name: err?.name,
      body: { date, driverId, checkId, status, blockedReason, note, freeTextValue, liveDispatchActive, liveDispatchChecklist },
      userId: session.user.id,
    });
    return NextResponse.json(
      {
        error: "save failed",
        message: err?.message ?? "Unknown error",
        code: err?.code ?? null,
        meta: err?.meta ?? null,
      },
      { status: 500 }
    );
  }
}
