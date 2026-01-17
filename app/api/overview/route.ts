import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { driverGroupFromEnum } from "@/app/lib/mappers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  if (!dateParam) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  const date = new Date(dateParam);
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "invalid date parameter" }, { status: 400 });
  }

  const now = new Date();
  const [drivers, checks, records] = await Promise.all([
    prisma.driver.findMany({
      where: { isActive: true },
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.check.findMany({
      where: {
        isActive: true,
        OR: [
          { columnType: "standard" },
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: [{ timeBlock: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.dailyCheckRecord.findMany({
      where: { date },
    }),
  ]);

  return NextResponse.json({
    drivers: drivers.map((driver) => ({
      ...driver,
      group: driverGroupFromEnum(driver.group),
    })),
    checks,
    records,
  });
}
