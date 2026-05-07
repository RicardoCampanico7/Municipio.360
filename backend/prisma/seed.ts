import {
  PrismaClient,
  CertificationStatus,
  Role,
  OccurrenceCategory,
  OccurrenceStatus,
  Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123!';

type DemoUserSeed = {
  name: string;
  biNumber: string;
  postalCode: string;
  email: string;
  role: Role;
  certStatus: CertificationStatus;
};

type DemoOccurrenceSeed = {
  authorEmail: string;
  category: OccurrenceCategory;
  otherCategoryDetail?: string | null;
  description: string;
  location: string;
  status: OccurrenceStatus;
  createdAt: Date;
  timeline: {
    status: OccurrenceStatus;
    changedByEmail?: string;
    createdAt: Date;
  }[];
  internalComments?: {
    authorEmail: string;
    content: string;
    createdAt: Date;
  }[];
};

const demoUsers: DemoUserSeed[] = [
  {
    name: 'Utilizador Civil',
    biNumber: '12345678 1 AB1',
    postalCode: '8000-000',
    email: 'civil@teste.pt',
    role: Role.CIVIL,
    certStatus: CertificationStatus.CERTIFIED,
  },
  {
    name: 'Civil Certificada - Ana Costa',
    biNumber: '42345678 1 AB4',
    postalCode: '8000-030',
    email: 'ana.costa@teste.pt',
    role: Role.CIVIL,
    certStatus: CertificationStatus.CERTIFIED,
  },
  {
    name: 'Civil Pendente - Rui Martins',
    biNumber: '52345678 1 AB5',
    postalCode: '8000-040',
    email: 'civil.pendente@teste.pt',
    role: Role.CIVIL,
    certStatus: CertificationStatus.PENDING,
  },
  {
    name: 'Civil Rejeitada - Marta Silva',
    biNumber: '62345678 1 AB6',
    postalCode: '8000-050',
    email: 'civil.rejeitada@teste.pt',
    role: Role.CIVIL,
    certStatus: CertificationStatus.REJECTED,
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

const demoOccurrences: DemoOccurrenceSeed[] = [
  {
    authorEmail: 'civil@teste.pt',
    category: OccurrenceCategory.ILUMINACAO_PUBLICA,
    description: 'Candeeiro apagado junto ao jardim municipal',
    location: 'Rua das Flores, Faro',
    status: OccurrenceStatus.SUBMETIDA,
    createdAt: new Date('2026-04-10T09:15:00.000Z'),
    timeline: [
      {
        status: OccurrenceStatus.SUBMETIDA,
        changedByEmail: 'civil@teste.pt',
        createdAt: new Date('2026-04-10T09:15:00.000Z'),
      },
    ],
  },
  {
    authorEmail: 'ana.costa@teste.pt',
    category: OccurrenceCategory.OUTROS,
    otherCategoryDetail: 'Contentor vandalizado',
    description: 'Contentor de residuos com tampa partida e lixo espalhado',
    location: 'Praceta Infante Dom Henrique, Faro',
    status: OccurrenceStatus.SUBMETIDA,
    createdAt: new Date('2026-04-11T17:45:00.000Z'),
    timeline: [
      {
        status: OccurrenceStatus.SUBMETIDA,
        changedByEmail: 'ana.costa@teste.pt',
        createdAt: new Date('2026-04-11T17:45:00.000Z'),
      },
    ],
  },
  {
    authorEmail: 'civil@teste.pt',
    category: OccurrenceCategory.BURACOS_PAVIMENTO,
    description: 'Buraco grande junto a passadeira, com risco para peoes',
    location: 'Avenida Central, Faro',
    status: OccurrenceStatus.EM_TRATAMENTO,
    createdAt: new Date('2026-04-08T08:30:00.000Z'),
    timeline: [
      {
        status: OccurrenceStatus.SUBMETIDA,
        changedByEmail: 'civil@teste.pt',
        createdAt: new Date('2026-04-08T08:30:00.000Z'),
      },
      {
        status: OccurrenceStatus.EM_TRATAMENTO,
        changedByEmail: 'operador@teste.pt',
        createdAt: new Date('2026-04-08T14:10:00.000Z'),
      },
    ],
    internalComments: [
      {
        authorEmail: 'operador@teste.pt',
        content: 'Equipa de manutencao avisada para verificacao no local.',
        createdAt: new Date('2026-04-08T14:20:00.000Z'),
      },
    ],
  },
  {
    authorEmail: 'ana.costa@teste.pt',
    category: OccurrenceCategory.LIMPEZA_URBANA,
    description: 'Acumulacao de monos junto aos ecopontos',
    location: 'Rua do Alto Rodes, Faro',
    status: OccurrenceStatus.EM_TRATAMENTO,
    createdAt: new Date('2026-04-09T11:05:00.000Z'),
    timeline: [
      {
        status: OccurrenceStatus.SUBMETIDA,
        changedByEmail: 'ana.costa@teste.pt',
        createdAt: new Date('2026-04-09T11:05:00.000Z'),
      },
      {
        status: OccurrenceStatus.EM_TRATAMENTO,
        changedByEmail: 'admin@teste.pt',
        createdAt: new Date('2026-04-09T15:40:00.000Z'),
      },
    ],
    internalComments: [
      {
        authorEmail: 'admin@teste.pt',
        content: 'Agendada recolha extraordinaria para o turno da manha.',
        createdAt: new Date('2026-04-09T15:45:00.000Z'),
      },
    ],
  },
  {
    authorEmail: 'civil@teste.pt',
    category: OccurrenceCategory.SINALIZACAO,
    description: 'Sinal de transito danificado junto ao cruzamento',
    location: 'Rua do Mercado, Faro',
    status: OccurrenceStatus.CONCLUIDA,
    createdAt: new Date('2026-04-02T10:00:00.000Z'),
    timeline: [
      {
        status: OccurrenceStatus.SUBMETIDA,
        changedByEmail: 'civil@teste.pt',
        createdAt: new Date('2026-04-02T10:00:00.000Z'),
      },
      {
        status: OccurrenceStatus.EM_TRATAMENTO,
        changedByEmail: 'operador@teste.pt',
        createdAt: new Date('2026-04-02T12:30:00.000Z'),
      },
      {
        status: OccurrenceStatus.CONCLUIDA,
        changedByEmail: 'operador@teste.pt',
        createdAt: new Date('2026-04-04T16:20:00.000Z'),
      },
    ],
    internalComments: [
      {
        authorEmail: 'operador@teste.pt',
        content: 'Sinal removido e substituido pela equipa de sinalizacao.',
        createdAt: new Date('2026-04-04T16:25:00.000Z'),
      },
    ],
  },
  {
    authorEmail: 'ana.costa@teste.pt',
    category: OccurrenceCategory.ESPACOS_PUBLICOS,
    description: 'Banco de jardim solto depois de queda de ramo',
    location: 'Jardim da Alameda, Faro',
    status: OccurrenceStatus.CONCLUIDA,
    createdAt: new Date('2026-04-01T09:40:00.000Z'),
    timeline: [
      {
        status: OccurrenceStatus.SUBMETIDA,
        changedByEmail: 'ana.costa@teste.pt',
        createdAt: new Date('2026-04-01T09:40:00.000Z'),
      },
      {
        status: OccurrenceStatus.EM_TRATAMENTO,
        changedByEmail: 'admin@teste.pt',
        createdAt: new Date('2026-04-01T13:00:00.000Z'),
      },
      {
        status: OccurrenceStatus.CONCLUIDA,
        changedByEmail: 'admin@teste.pt',
        createdAt: new Date('2026-04-03T10:30:00.000Z'),
      },
    ],
    internalComments: [
      {
        authorEmail: 'admin@teste.pt',
        content: 'Intervencao concluida e mobiliario confirmado no local.',
        createdAt: new Date('2026-04-03T10:35:00.000Z'),
      },
    ],
  },
];

/**
 * Cria ou atualiza utilizadores base e ocorrencias de demonstracao.
 * @return Promise<void> Promessa resolvida apos a populacao da base de dados.
 * Pre-condicao: A ligacao a base de dados deve estar configurada.
 * Pos-condicao: Existem utilizadores de demo por role e estado de certificacao.
 * Pos-condicao: Existem ocorrencias estaveis nos estados principais, com historico e comentarios internos.
 */
async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const usersByEmail = new Map<string, { id: number }>();

  for (const user of demoUsers) {
    const persistedUser = await prisma.user.upsert({
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
      select: { id: true, email: true },
    });

    usersByEmail.set(persistedUser.email, { id: persistedUser.id });
  }

  const demoUserIds = [...usersByEmail.values()].map((user) => user.id);

  await prisma.occurrence.deleteMany({
    where: { userId: { in: demoUserIds } },
  });

  for (const occurrence of demoOccurrences) {
    await createDemoOccurrence(occurrence, usersByEmail);
  }

  console.log('Seed concluido para demo final');
  console.table(
    demoUsers.map((user) => ({
      email: user.email,
      password: DEMO_PASSWORD,
      role: user.role,
      certStatus: user.certStatus,
    })),
  );
  console.log(`Ocorrencias demo recriadas: ${demoOccurrences.length}`);
}

async function createDemoOccurrence(
  occurrence: DemoOccurrenceSeed,
  usersByEmail: Map<string, { id: number }>,
) {
  const author = getSeedUser(usersByEmail, occurrence.authorEmail);
  const updatedAt =
    occurrence.timeline[occurrence.timeline.length - 1]?.createdAt ??
    occurrence.createdAt;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const createdOccurrence = await tx.occurrence.create({
      data: {
        category: occurrence.category,
        otherCategoryDetail: occurrence.otherCategoryDetail ?? null,
        description: occurrence.description,
        location: occurrence.location,
        status: occurrence.status,
        imageUrls: [],
        userId: author.id,
        createdAt: occurrence.createdAt,
        updatedAt,
      },
      select: { id: true },
    });

    for (const entry of occurrence.timeline) {
      const changedByUserId = entry.changedByEmail
        ? getSeedUser(usersByEmail, entry.changedByEmail).id
        : null;

      await tx.$executeRaw`
        INSERT INTO "OccurrenceStatusHistory" ("occurrenceId", "status", "changedByUserId", "createdAt")
        VALUES (
          ${createdOccurrence.id},
          CAST(${entry.status} AS "OccurrenceStatus"),
          ${changedByUserId},
          ${entry.createdAt}
        )
      `;
    }

    for (const comment of occurrence.internalComments ?? []) {
      await tx.occurrenceInternalComment.create({
        data: {
          occurrenceId: createdOccurrence.id,
          userId: getSeedUser(usersByEmail, comment.authorEmail).id,
          content: comment.content,
          createdAt: comment.createdAt,
          updatedAt: comment.createdAt,
        },
      });
    }
  });
}

function getSeedUser(usersByEmail: Map<string, { id: number }>, email: string) {
  const user = usersByEmail.get(email);

  if (!user) {
    throw new Error(`Utilizador de seed nao encontrado: ${email}`);
  }

  return user;
}

void main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
