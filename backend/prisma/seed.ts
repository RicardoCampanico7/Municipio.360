import { PrismaClient, CertificationStatus, Role, OccurrenceStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = 'Password123!';
  const hash = await bcrypt.hash(password, 10);

  const civil = await prisma.user.upsert({
    where: { email: 'civil@teste.pt' },
    update: {},
    create: {
      name: 'Utilizador Civil',
      biNumber: '12345678 1 AB1',
      postalCode: '8000-000',
      email: 'civil@teste.pt',
      passwordHash: hash,
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    },
  });

  await prisma.user.upsert({
    where: { email: 'operador@teste.pt' },
    update: {},
    create: {
      name: 'Operador Municipal',
      biNumber: '87654321 1 AB1',
      postalCode: '1000-100',
      email: 'operador@teste.pt',
      passwordHash: hash,
      role: Role.OPERADOR,
      certStatus: CertificationStatus.CERTIFIED,
    },
  });

  await prisma.occurrence.createMany({
    data: [
      {
        category: 'Iluminação pública',
        description: 'Candeeiro apagado junto ao jardim municipal',
        location: 'Rua das Flores, Faro',
        status: OccurrenceStatus.SUBMETIDA,
        imageUrls: [],
        userId: civil.id,
      },
      {
        category: 'Buraco na estrada',
        description: 'Buraco grande junto à passadeira',
        location: 'Avenida Central, Faro',
        status: OccurrenceStatus.EM_TRATAMENTO,
        imageUrls: [],
        userId: civil.id,
      },
      {
        category: 'Sinalização',
        description: 'Sinal de trânsito danificado',
        location: 'Rua do Mercado, Faro',
        status: OccurrenceStatus.CONCLUIDA,
        imageUrls: [],
        userId: civil.id,
      },
    ],
  });

  console.log('Seed concluído com utilizadores e ocorrências de demonstração');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });