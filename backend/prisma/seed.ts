import { PrismaClient, CertificationStatus, Role, OccurrenceStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Cria ou atualiza utilizadores base e ocorrencias de demonstracao para testes manuais.
 * @param none Script de seed sem parametros externos.
 * @return Promise<void> Promessa resolvida apos a populacao da base de dados.
 * Pre-condicao: A ligacao a base de dados deve estar configurada.
 * Pos-condicao: Existem utilizadores base com roles civil, operador e administrador, bem como ocorrencias de exemplo.
 */
async function main() {
  const password = 'Password123!';
  const hash = await bcrypt.hash(password, 10);

  const users = [
    {
      name: 'Utilizador Civil',
      biNumber: '12345678 1 AB1',
      postalCode: '8000-000',
      email: 'civil@teste.pt',
      role: Role.CIVIL,
      certStatus: CertificationStatus.CERTIFIED,
    },
    {
      name: 'Operador Municipal',
      biNumber: '22345678 1 AB2',
      postalCode: '8000-010',
      email: 'operador@teste.pt',
      role: Role.OPERADOR,
      certStatus: CertificationStatus.CERTIFIED,
    },
    {
      name: 'Administrador Municipal',
      biNumber: '32345678 1 AB3',
      postalCode: '8000-020',
      email: 'admin@teste.pt',
      role: Role.ADMINISTRADOR,
      certStatus: CertificationStatus.CERTIFIED,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        biNumber: user.biNumber,
        postalCode: user.postalCode,
        passwordHash: hash,
        role: user.role,
        certStatus: user.certStatus,
      },
      create: {
        ...user,
        passwordHash: hash,
      },
    });
  }

  const civil = await prisma.user.findUniqueOrThrow({
    where: { email: 'civil@teste.pt' },
    select: { id: true },
  });

  await prisma.occurrence.deleteMany({
    where: { userId: civil.id },
  });

  await prisma.occurrence.createMany({
    data: [
      {
        category: 'Iluminacao publica',
        description: 'Candeeiro apagado junto ao jardim municipal',
        location: 'Rua das Flores, Faro',
        status: OccurrenceStatus.SUBMETIDA,
        imageUrls: [],
        userId: civil.id,
      },
      {
        category: 'Buraco na estrada',
        description: 'Buraco grande junto a passadeira',
        location: 'Avenida Central, Faro',
        status: OccurrenceStatus.EM_TRATAMENTO,
        imageUrls: [],
        userId: civil.id,
      },
      {
        category: 'Sinalizacao',
        description: 'Sinal de transito danificado',
        location: 'Rua do Mercado, Faro',
        status: OccurrenceStatus.CONCLUIDA,
        imageUrls: [],
        userId: civil.id,
      },
    ],
  });

  console.log(
    'Seed concluido:',
    users.map((user) => user.email).join(', '),
    '- com ocorrencias de demonstracao',
  );
}

void main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });