const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  try {
    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: { email: 'admin@dispatch.com' }
    });

    if (existing) {
      console.log('User already exists:', existing.email);
      return;
    }

    // Create dev user
    const user = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@dispatch.com',
        role: 'admin',
      }
    });
    console.log('User created:', user.id);

    // Create credentials
    const passwordHash = await bcrypt.hash('dispatch123', 10);
    await prisma.userCredential.create({
      data: {
        userId: user.id,
        passwordHash,
      }
    });
    console.log('Credentials created');
    console.log('\n✅ Dev user created successfully!');
    console.log('Email: admin@dispatch.com');
    console.log('Password: dispatch123');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
