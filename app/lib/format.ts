import type { DriverGroup, RecordStatus, TimeBlock } from "@/app/lib/types";

export const groupOrder: DriverGroup[] = [
  "New Drivers",
  "Local Drivers",
  "Experienced Drivers",
];

export const timeBlocks: TimeBlock[] = ["Morning", "Midday", "Afternoon"];

export const statusCycle: RecordStatus[] = [
  "not_started",
  "in_progress",
  "done",
  "blocked",
];

export const statusColors: Record<RecordStatus, string> = {
  not_started: "bg-white/60 border border-neutral-200",
  in_progress: "bg-sun/80 border border-sun/80",
  done: "bg-moss/80 border border-moss/80 text-white",
  blocked: "bg-ember/80 border border-ember/80 text-white",
};
