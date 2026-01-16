export const driverGroups = [
  "New Drivers",
  "Local Drivers",
  "Experienced Drivers",
] as const;

export const seedDrivers = [
  // New Drivers
  { name: "Clay, Zachary", truckNumber: "169", group: "New Drivers" },
  { name: "Burroughs, Fred", truckNumber: "158", group: "New Drivers" },
  { name: "Frear, Daniel", truckNumber: "166", group: "New Drivers" },
  { name: "Perry, Terrance", truckNumber: "182", group: "New Drivers" },
  { name: "Foss, Stan", truckNumber: "165", group: "New Drivers" },
  { name: "Stevens, Dustin", truckNumber: "162", group: "New Drivers" },
  { name: "Tazmon, JD", truckNumber: "163", group: "New Drivers" },
  { name: "Rout-Mayo, Kevin", truckNumber: "180", group: "New Drivers" },
  { name: "Taylor, James", truckNumber: "155", group: "New Drivers" },
  // Local Drivers
  { name: "Kelly Olson", truckNumber: "147", group: "Local Drivers" },
  { name: "Travis Fonger", truckNumber: "101", group: "Local Drivers" },
  { name: "Joseph Cotes", truckNumber: "124", group: "Local Drivers" },
  { name: "Jack Grant", truckNumber: "97", group: "Local Drivers" },
  { name: "Roger Gibson", truckNumber: "105", group: "Local Drivers" },
  { name: "Evan Christensen", truckNumber: "144", group: "Local Drivers" },
  { name: "Shawn Kilgore", truckNumber: "146", group: "Local Drivers" },
  // Experienced Drivers
  { name: "Allred, Tysen", truckNumber: "187", group: "Experienced Drivers" },
  { name: "Angel, Joey", truckNumber: "193", group: "Experienced Drivers" },
  { name: "Blair, Eric", truckNumber: "196", group: "Experienced Drivers" },
  { name: "Bringard, James", truckNumber: "154", group: "Experienced Drivers" },
  { name: "Costello, Jason", truckNumber: "191", group: "Experienced Drivers" },
  { name: "Currie, Randy", truckNumber: "170", group: "Experienced Drivers" },
  { name: "Etier, Jimmy", truckNumber: "160", group: "Experienced Drivers" },
  { name: "Farmer, Larry", truckNumber: "159", group: "Experienced Drivers" },
  { name: "Ferrier, Darrel", truckNumber: "192", group: "Experienced Drivers" },
  { name: "Garcia, Jose", truckNumber: "172", group: "Experienced Drivers" },
  { name: "Gilbert, Sherman", truckNumber: "171", group: "Experienced Drivers" },
  { name: "Henry, Eddie", truckNumber: "194", group: "Experienced Drivers" },
  { name: "Hilden, Henry", truckNumber: "168", group: "Experienced Drivers" },
  { name: "Horn, Harrell", truckNumber: "176", group: "Experienced Drivers" },
  { name: "Hunsaker, Ryan", truckNumber: "185", group: "Experienced Drivers" },
  { name: "Kerns, Luke", truckNumber: "183", group: "Experienced Drivers" },
  { name: "Kuddes, Donald", truckNumber: "162", group: "Experienced Drivers" },
  { name: "Lawson, Wesley", truckNumber: "167", group: "Experienced Drivers" },
  { name: "McWhorter, Wes", truckNumber: "186", group: "Experienced Drivers" },
  { name: "Megahey, Kevin", truckNumber: "157", group: "Experienced Drivers" },
  { name: "Morrison, Steve", truckNumber: "175", group: "Experienced Drivers" },
  { name: "Nicholson, Cory", truckNumber: "161", group: "Experienced Drivers" },
  { name: "Romano, Javier", truckNumber: "174", group: "Experienced Drivers" },
  { name: "Rule, Chris", truckNumber: "188", group: "Experienced Drivers" },
  { name: "Sampson, Michael", truckNumber: "181", group: "Experienced Drivers" },
  { name: "Scott, Rich", truckNumber: "179", group: "Experienced Drivers" },
  { name: "Silva, Lester", truckNumber: "177", group: "Experienced Drivers" },
  { name: "Skousen, Eddie", truckNumber: "173", group: "Experienced Drivers" },
  { name: "Tuttle, Steven", truckNumber: "166", group: "Experienced Drivers" },
  { name: "Vanleuvan, Jason", truckNumber: "184", group: "Experienced Drivers" },
  { name: "Wood, Karl", truckNumber: "178", group: "Experienced Drivers" },
];

export const seedChecks = {
  Morning: [
    {
      systemName: "truck",
      displayName: "Truck",
      instructionText: "Verify truck is ready for the day",
    },
    {
      systemName: "where",
      displayName: "Where",
      instructionText: "Confirm driver location",
    },
    {
      systemName: "rolling",
      displayName: "Rolling",
      instructionText: "Confirm driver is rolling",
    },
    {
      systemName: "ontime",
      displayName: "OnTime",
      instructionText: "Verify driver is on time",
    },
    {
      systemName: "pta",
      displayName: "PTA",
      instructionText: "Check PTA status",
    },
    {
      systemName: "morning_route_fuel",
      displayName: "Route/Fuel",
      instructionText: "Verify route and fuel status",
    },
  ],
  Midday: [
    {
      systemName: "reload_assigned",
      displayName: "Reload Assigned",
      instructionText: "Verify reload assignment",
    },
    {
      systemName: "receiver",
      displayName: "Receiver",
      instructionText: "Check receiver status",
    },
    {
      systemName: "live_dispatch",
      displayName: "Live Dispatch",
      instructionText: "Check live dispatch status",
    },
    {
      systemName: "midday_route_fuel",
      displayName: "Route/Fuel",
      instructionText: "Verify midday route and fuel",
    },
  ],
  Afternoon: [
    {
      systemName: "shipper",
      displayName: "Shipper",
      instructionText: "Verify shipper contact",
    },
    {
      systemName: "eta_to_final",
      displayName: "ETA to Final",
      instructionText: "Confirm ETA to final destination",
    },
    {
      systemName: "del_sched",
      displayName: "Del Sched",
      instructionText: "Verify delivery schedule",
    },
    {
      systemName: "afternoon_route_fuel",
      displayName: "Route/Fuel",
      instructionText: "Check afternoon route and fuel",
    },
    {
      systemName: "fn_verbal",
      displayName: "Fn Verbal",
      instructionText: "Final verbal confirmation",
    },
  ],
} as const;
