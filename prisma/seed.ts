import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedChecks, seedDrivers } from "@/config/seed";

const prisma = new PrismaClient();

const groupMap: Record<string, "New_Drivers" | "Local_Drivers" | "Experienced_Drivers"> = {
  "New Drivers": "New_Drivers",
  "Local Drivers": "Local_Drivers",
  "Experienced Drivers": "Experienced_Drivers",
};

async function main() {
  const passwordHash = await bcrypt.hash("dispatch", 10);

  const admin = await prisma.user.upsert({
    where: { email: "dispatcher@example.com" },
    update: {},
    create: {
      name: "Dispatcher",
      email: "dispatcher@example.com",
      role: "admin",
      credentials: {
        create: { passwordHash },
      },
    },
  });

  const existingDrivers = await prisma.driver.count();
  if (existingDrivers === 0) {
    await prisma.driver.createMany({
      data: seedDrivers.map((driver, index) => ({
        name: driver.name,
        truckNumber: driver.truckNumber,
        group: groupMap[driver.group],
        sortOrder: index + 1,
      })),
    });
  }

  const existingChecks = await prisma.check.count();
  if (existingChecks === 0) {
    const now = new Date();
    const records = [
      ...seedChecks.Morning.map((check, index) => ({
        ...check,
        timeBlock: "Morning" as const,
        sortOrder: index + 1,
        columnType: "standard" as const,
        isActive: true,
        expiresAt: null,
        createdAt: now,
      })),
      ...seedChecks.Midday.map((check, index) => ({
        ...check,
        timeBlock: "Midday" as const,
        sortOrder: index + 1,
        columnType: "standard" as const,
        isActive: true,
        expiresAt: null,
        createdAt: now,
      })),
      ...seedChecks.Afternoon.map((check, index) => ({
        ...check,
        timeBlock: "Afternoon" as const,
        sortOrder: index + 1,
        columnType: "standard" as const,
        isActive: true,
        expiresAt: null,
        createdAt: now,
      })),
    ];

    await prisma.check.createMany({ data: records });
  }

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      entityType: "record",
      entityId: admin.id,
      action: "create",
      summary: "Seeded initial data",
      diff: { seed: true },
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
