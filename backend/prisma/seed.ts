import { CertificationStatus, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Cria ou atualiza utilizadores base para testes manuais da aplicacao.
 * @param none Script de seed sem parametros externos.
 * @return Promise<void> Promessa resolvida apos a populacao da base de dados.
 * Pre-condicao: A ligacao a base de dados deve estar configurada.
 * Pos-condicao: Existem utilizadores base com roles civil, operador e administrador.
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

  console.log('Seed concluido:', users.map((user) => user.email).join(', '));
}

void main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
