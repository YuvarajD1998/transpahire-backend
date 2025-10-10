import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🌱 Seeding database...');

  // Create platform admin
  const hashedPassword = await hashPassword('admin123');
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@transpahire.com' },
    update: {},
    create: {
      email: 'admin@transpahire.com',
      password: hashedPassword,
      role: 'PLATFORM_ADMIN', // Use string literal instead of Role enum
      verified: true,
    },
  });

  // Create sample candidate
  const candidateUser = await prisma.user.upsert({
    where: { email: 'candidate@example.com' },
    update: {},
    create: {
      email: 'candidate@example.com',
      password: await hashPassword('password123'),
      role: 'CANDIDATE', // Use string literal
      verified: true,
      profile: {
        create: {
          firstName: 'John',
          lastName: 'Doe',
          skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
          summary: 'Experienced full-stack developer with 5 years of experience',
        },
      },
      subscription: {
        create: {
          tier: 'FREE', // Use string literal instead of SubscriptionTier enum
        },
      },
    },
  });

  // Create sample organization
  const organization = await prisma.organization.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'TechCorp Inc.',
      plan: 'ORG_BASIC', // Use string literal
      verified: true,
    },
  });

  // Create recruiter user
  const recruiterUser = await prisma.user.upsert({
    where: { email: 'recruiter@techcorp.com' },
    update: {},
    create: {
      email: 'recruiter@techcorp.com',
      password: await hashPassword('password123'),
      role: 'RECRUITER', // Use string literal
      tenantId: organization.id,
      verified: true,
    },
  });

  // Create user-org role
  await prisma.userOrgRole.upsert({
    where: {
      userId_orgId: {
        userId: recruiterUser.id,
        orgId: organization.id,
      },
    },
    update: {},
    create: {
      userId: recruiterUser.id,
      orgId: organization.id,
      role: 'ORG_ADMIN', // Use string literal
    },
  });

  // Create sample job
  await prisma.job.create({
    data: {
      title: 'Senior Full-Stack Developer',
      description: 'We are looking for an experienced full-stack developer to join our team and help build amazing products.',
      location: 'San Francisco, CA',
      remote: true,
      salaryMin: 120000,
      salaryMax: 180000,
      type: 'FULL_TIME',
      orgId: organization.id,
      createdBy: recruiterUser.id,
      requirements: {
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL'],
        experience: '5+ years',
      },
    },
  });

  console.log('✅ Seeding completed');
  console.log(`👤 Created admin: admin@transpahire.com (password: admin123)`);
  console.log(`👤 Created candidate: candidate@example.com (password: password123)`);
  console.log(`👤 Created recruiter: recruiter@techcorp.com (password: password123)`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
