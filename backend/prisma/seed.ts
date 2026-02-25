import { PrismaClient, CertificationStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'civil@teste.pt';
  const password = 'Password123!';
  const hash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: hash,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    },
  });

  console.log('Seed concluído:', email);
}

main()
  .finally(async () => prisma.$disconnect());
