const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Create enums
    const enums = [
      `DO $$ BEGIN CREATE TYPE "UserRole" AS ENUM ('dispatcher', 'admin'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN CREATE TYPE "DriverGroup" AS ENUM ('New_Drivers', 'Local_Drivers', 'Experienced_Drivers'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN CREATE TYPE "TimeBlock" AS ENUM ('Morning', 'Midday', 'Afternoon'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN CREATE TYPE "ColumnType" AS ENUM ('standard', 'temporary'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN CREATE TYPE "RecordStatus" AS ENUM ('not_started', 'in_progress', 'done', 'blocked'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN CREATE TYPE "AuditEntityType" AS ENUM ('driver', 'check', 'record'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'deactivate', 'reactivate', 'rename', 'reorder', 'move_timeblock'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    ];

    for (const sql of enums) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.log('Enums created');

    // Create User table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        role "UserRole" NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('User table created');

    // Create UserCredential table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserCredential" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID UNIQUE NOT NULL REFERENCES "User"(id),
        "passwordHash" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('UserCredential table created');

    // Create Driver table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Driver" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        "truckNumber" TEXT,
        "group" "DriverGroup" NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "sortOrder" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Driver table created');

    // Create Check table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Check" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "systemName" TEXT UNIQUE NOT NULL,
        "displayName" TEXT NOT NULL,
        "timeBlock" "TimeBlock" NOT NULL,
        "sortOrder" INTEGER NOT NULL,
        "instructionText" TEXT NOT NULL,
        "columnType" "ColumnType" NOT NULL DEFAULT 'temporary',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "expiresAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Check table created');

    // Create DailyCheckRecord table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DailyCheckRecord" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL,
        "driverId" UUID NOT NULL REFERENCES "Driver"(id),
        "checkId" UUID NOT NULL REFERENCES "Check"(id),
        status "RecordStatus" NOT NULL DEFAULT 'not_started',
        "startedAt" TIMESTAMP(3),
        "completedAt" TIMESTAMP(3),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedByUserId" UUID NOT NULL REFERENCES "User"(id),
        "blockedReason" TEXT,
        note TEXT,
        UNIQUE(date, "driverId", "checkId")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "DailyCheckRecord_date_idx" ON "DailyCheckRecord"(date)`);
    console.log('DailyCheckRecord table created');

    // Create AuditLog table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AuditLog" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "userId" UUID NOT NULL REFERENCES "User"(id),
        "entityType" "AuditEntityType" NOT NULL,
        "entityId" UUID NOT NULL,
        action "AuditAction" NOT NULL,
        summary TEXT NOT NULL,
        diff JSONB NOT NULL
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AuditLog_occurredAt_idx" ON "AuditLog"("occurredAt")`);
    console.log('AuditLog table created');

    console.log('All tables created successfully!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
