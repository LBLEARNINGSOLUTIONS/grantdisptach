export type TimeBlock = "Morning" | "Midday" | "Afternoon";
export type RecordStatus = "not_started" | "in_progress" | "done" | "blocked";
export type DriverGroup = "New Drivers" | "Local Drivers" | "Experienced Drivers";

export type Driver = {
  id: string;
  name: string;
  truckNumber?: string | null;
  group: DriverGroup;
  sortOrder: number;
  isActive: boolean;
};

export type CheckColumn = {
  id: string;
  systemName: string;
  displayName: string;
  timeBlock: TimeBlock;
  sortOrder: number;
  instructionText: string;
  columnType: "standard" | "temporary";
  isActive: boolean;
  expiresAt?: string | null;
};

export type DailyCheckRecord = {
  id: string;
  date: string;
  driverId: string;
  checkId: string;
  status: RecordStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt: string;
  updatedByUserId: string;
  blockedReason?: string | null;
  note?: string | null;
};
