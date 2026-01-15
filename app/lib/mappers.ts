import type { DriverGroup } from "@/app/lib/types";

export const driverGroupToEnum = (group: DriverGroup) => {
  switch (group) {
    case "New Drivers":
      return "New_Drivers" as const;
    case "Local Drivers":
      return "Local_Drivers" as const;
    case "Experienced Drivers":
      return "Experienced_Drivers" as const;
  }
};

export const driverGroupFromEnum = (
  group: "New_Drivers" | "Local_Drivers" | "Experienced_Drivers"
): DriverGroup => {
  switch (group) {
    case "New_Drivers":
      return "New Drivers";
    case "Local_Drivers":
      return "Local Drivers";
    case "Experienced_Drivers":
      return "Experienced Drivers";
  }
};
