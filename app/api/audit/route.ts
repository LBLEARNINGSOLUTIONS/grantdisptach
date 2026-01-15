import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const changes = await prisma.auditLog.findMany({
    where: { occurredAt: { gte: since } },
    orderBy: { occurredAt: "desc" },
    include: { user: true },
  });

  return NextResponse.json({ changes });
}
