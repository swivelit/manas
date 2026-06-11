import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { prisma } from './prisma';
import { getAdminCredentialConfig } from './adminConfig';

export async function ensureConfiguredAdmin(): Promise<void> {
  const admin = getAdminCredentialConfig();
  const passwordHash = await bcrypt.hash(admin.password, 10);

  await prisma.user.upsert({
    where: { email: admin.email },
    update: {
      name: admin.name,
      role: Role.ADMIN,
      passwordHash,
      isActive: true,
    },
    create: {
      email: admin.email,
      name: admin.name,
      role: Role.ADMIN,
      passwordHash,
      isActive: true,
    },
  });

  console.log(`[admin-bootstrap] ensured configured admin ${admin.email}`);
}
