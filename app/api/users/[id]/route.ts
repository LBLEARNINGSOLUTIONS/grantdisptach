import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = params;

  // Prevent deleting yourself
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "cannot delete your own account" },
      { status: 400 }
    );
  }

  // Delete credentials first (foreign key constraint)
  await prisma.userCredential.deleteMany({
    where: { userId: id },
  });

  // Delete user
  await prisma.user.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
