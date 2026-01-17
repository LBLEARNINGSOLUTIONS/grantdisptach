import { Suspense } from "react";
import ChecklistClient from "@/app/components/ChecklistClient";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ChecklistClient />
    </Suspense>
  );
}
