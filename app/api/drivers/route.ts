import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { driverGroupFromEnum, driverGroupToEnum } from "@/app/lib/mappers";

export async function GET() {
  const drivers = await prisma.driver.findMany({ orderBy: [{ group: "asc" }, { sortOrder: "asc" }] });
  return NextResponse.json({
    drivers: drivers.map((driver) => ({
      ...driver,
      group: driverGroupFromEnum(driver.group),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, truckNumber, group } = body;
  if (!name || !group) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const maxSort = await prisma.driver.aggregate({
    where: { group: driverGroupToEnum(group) },
    _max: { sortOrder: true },
  });

  const driver = await prisma.driver.create({
    data: {
      name,
      truckNumber: truckNumber ?? null,
      group: driverGroupToEnum(group),
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      entityType: "driver",
      entityId: driver.id,
      action: "create",
      summary: `Created driver ${driver.name}`,
      diff: { after: driver },
    },
  });

  return NextResponse.json({
    driver: { ...driver, group: driverGroupFromEnum(driver.group) },
  });
}
