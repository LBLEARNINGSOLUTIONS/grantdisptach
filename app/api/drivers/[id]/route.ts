import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { driverGroupFromEnum, driverGroupToEnum } from "@/app/lib/mappers";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, truckNumber, group, isActive, sortOrder } = body;

  const existing = await prisma.driver.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const updated = await prisma.driver.update({
    where: { id: params.id },
    data: {
      name: name ?? undefined,
      truckNumber: truckNumber ?? undefined,
      group: group ? driverGroupToEnum(group) : undefined,
      isActive: typeof isActive === "boolean" ? isActive : undefined,
      sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
    },
  });

  const action =
    typeof isActive === "boolean" && isActive !== existing.isActive
      ? isActive
        ? "reactivate"
        : "deactivate"
      : typeof sortOrder === "number" && sortOrder !== existing.sortOrder
        ? "reorder"
        : name && name !== existing.name
          ? "rename"
          : "update";

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      entityType: "driver",
      entityId: updated.id,
      action,
      summary: `Driver ${updated.name} ${action}`,
      diff: { before: existing, after: updated },
    },
  });

  return NextResponse.json({
    driver: { ...updated, group: driverGroupFromEnum(updated.group) },
  });
}
