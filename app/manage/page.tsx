import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import ManageClient from "@/app/components/ManageClient";

export default async function ManagePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/");
  }

  return <ManageClient />;
}
