import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const checks = await prisma.check.findMany({ orderBy: [{ timeBlock: "asc" }, { sortOrder: "asc" }] });
  return NextResponse.json({ checks });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { displayName, timeBlock, instructionText } = body;
  if (!displayName || !timeBlock) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const maxSort = await prisma.check.aggregate({
    where: { timeBlock },
    _max: { sortOrder: true },
  });

  const systemName = `${timeBlock.toLowerCase()}_${Date.now()}`;

  const check = await prisma.check.create({
    data: {
      systemName,
      displayName,
      timeBlock,
      instructionText: instructionText ?? "",
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      columnType: "temporary",
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      entityType: "check",
      entityId: check.id,
      action: "create",
      summary: `Created column ${check.displayName}`,
      diff: { after: check },
    },
  });

  return NextResponse.json({ check });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, isActive } = body;

  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  // Fetch current state to determine action type
  const currentCheck = await prisma.check.findUnique({ where: { id } });

  const check = await prisma.check.update({
    where: { id },
    data: { isActive },
  });

  // Determine specific action based on state change
  const action = !currentCheck?.isActive && isActive ? "reactivate"
               : currentCheck?.isActive && !isActive ? "deactivate"
               : "update";

  const actionLabel = action === "reactivate" ? "Reactivated"
                    : action === "deactivate" ? "Deactivated"
                    : "Updated";

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      entityType: "check",
      entityId: check.id,
      action,
      summary: `${actionLabel} column ${check.displayName}`,
      diff: { after: check },
    },
  });

  return NextResponse.json({ check });
}
