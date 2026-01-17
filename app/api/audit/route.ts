import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const changes = await prisma.auditLog.findMany({
    where: { occurredAt: { gte: since } },
    orderBy: { occurredAt: "desc" },
    include: { user: true },
  });

  return NextResponse.json({ changes });
}
