import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    displayName,
    timeBlock,
    instructionText,
    isActive,
    sortOrder,
    columnType,
    expiresAt,
  } = body;

  const existing = await prisma.check.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const updated = await prisma.check.update({
    where: { id: params.id },
    data: {
      displayName: displayName ?? undefined,
      timeBlock: timeBlock ?? undefined,
      instructionText: instructionText ?? undefined,
      isActive: typeof isActive === "boolean" ? isActive : undefined,
      sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
      columnType: columnType ?? undefined,
      expiresAt: expiresAt ?? undefined,
    },
  });

  const action =
    typeof isActive === "boolean" && isActive !== existing.isActive
      ? isActive
        ? "reactivate"
        : "deactivate"
      : typeof sortOrder === "number" && sortOrder !== existing.sortOrder
        ? "reorder"
        : timeBlock && timeBlock !== existing.timeBlock
          ? "move_timeblock"
          : displayName && displayName !== existing.displayName
            ? "rename"
            : "update";

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      entityType: "check",
      entityId: updated.id,
      action,
      summary: `Column ${updated.displayName} ${action}`,
      diff: { before: existing, after: updated },
    },
  });

  return NextResponse.json({ check: updated });
}
