export const driverGroups = [
  "New Drivers",
  "Local Drivers",
  "Experienced Drivers",
] as const;

export const seedDrivers = [
  { name: "Sample Driver A", truckNumber: "101", group: "New Drivers" },
  { name: "Sample Driver B", truckNumber: "202", group: "Local Drivers" },
  { name: "Sample Driver C", truckNumber: "303", group: "Experienced Drivers" },
];

export const seedChecks = {
  Morning: [
    {
      systemName: "morning_check_1",
      displayName: "Morning Check 1",
      instructionText: "Do this:\n- Placeholder instruction\n\nDone means:\n- Placeholder done criteria\n\nWhat to say:\n- Placeholder script",
    },
  ],
  Midday: [
    {
      systemName: "midday_check_1",
      displayName: "Midday Check 1",
      instructionText: "Do this:\n- Placeholder instruction\n\nDone means:\n- Placeholder done criteria",
    },
  ],
  Afternoon: [
    {
      systemName: "afternoon_check_1",
      displayName: "Afternoon Check 1",
      instructionText: "Do this:\n- Placeholder instruction\n\nDone means:\n- Placeholder done criteria",
    },
  ],
} as const;
