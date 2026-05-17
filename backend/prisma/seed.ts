import {
  PrismaClient,
  CertificationStatus,
  Role,
  OccurrenceCategory,
  OccurrenceStatus,
  Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123!';
const SEED_ASSETS_DIR = join(__dirname, 'seed-assets');
const LEGACY_DEMO_EMAILS = [
  'civil@teste.pt',
  'ana.costa@teste.pt',
  'civil.pendente@teste.pt',
  'civil.rejeitada@teste.pt',
  'operador@teste.pt',
  'admin@teste.pt',
];

type DemoUserSeed = {
  name: string;
  biNumber: string;
  postalCode: string;
  email: string;
  role: Role;
  certStatus: CertificationStatus;
  avatarUrl?: string | null;
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

function seedAvatarDataUrl(fileName: string) {
  const image = readFileSync(join(SEED_ASSETS_DIR, fileName));

  return `data:image/png;base64,${image.toString('base64')}`;
}

const demoUsers: DemoUserSeed[] = [
  {
    name: 'Cristiano Ronaldo',
    biNumber: '10000001 1 CR1',
    postalCode: '8000-000',
    email: 'cristiano.ronaldo@demo.municipio360.test',
    role: Role.OPERADOR,
    certStatus: CertificationStatus.CERTIFIED,
    avatarUrl: seedAvatarDataUrl('cristiano-ronaldo.png'),
  },
  {
    name: 'The Rock',
    biNumber: '10000002 1 TR2',
    postalCode: '8000-010',
    email: 'the.rock@demo.municipio360.test',
    role: Role.OPERADOR,
    certStatus: CertificationStatus.CERTIFIED,
    avatarUrl: seedAvatarDataUrl('the-rock.png'),
  },
  {
    name: 'Benjamin Netanyahu',
    biNumber: '10000003 1 BN3',
    postalCode: '8000-020',
    email: 'benjamin.netanyahu@demo.municipio360.test',
    role: Role.OPERADOR,
    certStatus: CertificationStatus.CERTIFIED,
    avatarUrl: seedAvatarDataUrl('benjamin-netanyahu.png'),
  },
  {
    name: 'Donald Trump',
    biNumber: '10000004 1 DT4',
    postalCode: '8000-030',
    email: 'donald.trump@demo.municipio360.test',
    role: Role.OPERADOR,
    certStatus: CertificationStatus.CERTIFIED,
    avatarUrl: seedAvatarDataUrl('donald-trump.png'),
  },
  {
    name: 'Bolsonaro',
    biNumber: '10000005 1 BO5',
    postalCode: '8000-040',
    email: 'bolsonaro@demo.municipio360.test',
    role: Role.CIVIL,
    certStatus: CertificationStatus.CERTIFIED,
    avatarUrl: seedAvatarDataUrl('bolsonaro.png'),
  },
  {
    name: 'Guilherme Gaspar',
    biNumber: '10000006 1 GG6',
    postalCode: '8000-050',
    email: 'guilherme.gaspar@demo.municipio360.test',
    role: Role.ADMINISTRADOR,
    certStatus: CertificationStatus.CERTIFIED,
  },
  {
    name: 'Ricardo Campaniço',
    biNumber: '10000007 1 RC7',
    postalCode: '8000-060',
    email: 'ricardo.campanico@demo.municipio360.test',
    role: Role.ADMINISTRADOR,
    certStatus: CertificationStatus.CERTIFIED,
  },
  {
    name: 'Alan Martynyuk',
    biNumber: '10000008 1 AM8',
    postalCode: '8000-070',
    email: 'alan.martynyuk@demo.municipio360.test',
    role: Role.ADMINISTRADOR,
    certStatus: CertificationStatus.CERTIFIED,
  },
  {
    name: 'David Domingos',
    biNumber: '10000009 1 DD9',
    postalCode: '8000-080',
    email: 'david.domingos@demo.municipio360.test',
    role: Role.ADMINISTRADOR,
    certStatus: CertificationStatus.CERTIFIED,
  },
  {
    name: 'Lionel Messi',
    biNumber: '10000010 1 LM0',
    postalCode: '8000-090',
    email: 'lionel.messi@demo.municipio360.test',
    role: Role.CIVIL,
    certStatus: CertificationStatus.CERTIFIED,
    avatarUrl: seedAvatarDataUrl('lionel-messi.png'),
  },
  {
    name: 'Lebron James',
    biNumber: '10000011 1 LJ1',
    postalCode: '8000-100',
    email: 'lebron.james@demo.municipio360.test',
    role: Role.CIVIL,
    certStatus: CertificationStatus.CERTIFIED,
    avatarUrl: seedAvatarDataUrl('lebron-james.png'),
  },
  {
    name: 'Luka Dončić',
    biNumber: '10000012 1 LD2',
    postalCode: '8000-110',
    email: 'luka.doncic@demo.municipio360.test',
    role: Role.CIVIL,
    certStatus: CertificationStatus.CERTIFIED,
    avatarUrl: seedAvatarDataUrl('luka-doncic.png'),
  },
  {
    name: 'Taylor Swift',
    biNumber: '10000013 1 TS3',
    postalCode: '8000-120',
    email: 'taylor.swift@demo.municipio360.test',
    role: Role.CIVIL,
    certStatus: CertificationStatus.CERTIFIED,
    avatarUrl: seedAvatarDataUrl('taylor-swift.png'),
  },
  {
    name: 'MrBeast',
    biNumber: '10000014 1 MB4',
    postalCode: '8000-130',
    email: 'mrbeast@demo.municipio360.test',
    role: Role.CIVIL,
    certStatus: CertificationStatus.PENDING,
    avatarUrl: seedAvatarDataUrl('mrbeast.png'),
  },
  {
    name: 'Sydney Sweeney',
    biNumber: '10000015 1 SS5',
    postalCode: '8000-140',
    email: 'sydney.sweeney@demo.municipio360.test',
    role: Role.CIVIL,
    certStatus: CertificationStatus.PENDING,
    avatarUrl: seedAvatarDataUrl('sydney-sweeney.png'),
  },
  {
    name: 'IShowSpeed',
    biNumber: '10000016 1 IS6',
    postalCode: '8000-150',
    email: 'ishowspeed@demo.municipio360.test',
    role: Role.OPERADOR,
    certStatus: CertificationStatus.REJECTED,
    avatarUrl: seedAvatarDataUrl('ishowspeed.png'),
  },
  {
    name: 'Neymar Jr',
    biNumber: '10000017 1 NJ7',
    postalCode: '8000-160',
    email: 'neymar.jr@demo.municipio360.test',
    role: Role.CIVIL,
    certStatus: CertificationStatus.NONE,
    avatarUrl: seedAvatarDataUrl('neymar-jr.png'),
  },
];

const DEMO_EMAILS = demoUsers.map((user) => user.email);

const demoOccurrences: DemoOccurrenceSeed[] = [
  {
    authorEmail: 'cristiano.ronaldo@demo.municipio360.test',
    category: OccurrenceCategory.ILUMINACAO_PUBLICA,
    description: 'Candeeiro apagado junto ao jardim municipal',
    location: 'Rua das Flores, Faro',
    status: OccurrenceStatus.SUBMETIDA,
    createdAt: new Date('2026-04-10T09:15:00.000Z'),
    timeline: [
      {
        status: OccurrenceStatus.SUBMETIDA,
        changedByEmail: 'cristiano.ronaldo@demo.municipio360.test',
        createdAt: new Date('2026-04-10T09:15:00.000Z'),
      },
    ],
  },
  {
    authorEmail: 'lionel.messi@demo.municipio360.test',
    category: OccurrenceCategory.OUTROS,
    otherCategoryDetail: 'Contentor vandalizado',
    description: 'Contentor de residuos com tampa partida e lixo espalhado',
    location: 'Praceta Infante Dom Henrique, Faro',
    status: OccurrenceStatus.SUBMETIDA,
    createdAt: new Date('2026-04-11T17:45:00.000Z'),
    timeline: [
      {
        status: OccurrenceStatus.SUBMETIDA,
        changedByEmail: 'lionel.messi@demo.municipio360.test',
        createdAt: new Date('2026-04-11T17:45:00.000Z'),
      },
    ],
  },
  {
    authorEmail: 'the.rock@demo.municipio360.test',
    category: OccurrenceCategory.BURACOS_PAVIMENTO,
    description: 'Buraco grande junto a passadeira, com risco para peoes',
    location: 'Avenida Central, Faro',
    status: OccurrenceStatus.EM_TRATAMENTO,
    createdAt: new Date('2026-04-08T08:30:00.000Z'),
    timeline: [
      {
        status: OccurrenceStatus.SUBMETIDA,
        changedByEmail: 'the.rock@demo.municipio360.test',
        createdAt: new Date('2026-04-08T08:30:00.000Z'),
      },
      {
        status: OccurrenceStatus.EM_TRATAMENTO,
        changedByEmail: 'guilherme.gaspar@demo.municipio360.test',
        createdAt: new Date('2026-04-08T14:10:00.000Z'),
      },
    ],
    internalComments: [
      {
        authorEmail: 'guilherme.gaspar@demo.municipio360.test',
        content: 'Equipa de manutencao avisada para verificacao no local.',
        createdAt: new Date('2026-04-08T14:20:00.000Z'),
      },
    ],
  },
  {
    authorEmail: 'benjamin.netanyahu@demo.municipio360.test',
    category: OccurrenceCategory.LIMPEZA_URBANA,
    description: 'Acumulacao de monos junto aos ecopontos',
    location: 'Rua do Alto Rodes, Faro',
    status: OccurrenceStatus.EM_TRATAMENTO,
    createdAt: new Date('2026-04-09T11:05:00.000Z'),
    timeline: [
      {
        status: OccurrenceStatus.SUBMETIDA,
        changedByEmail: 'benjamin.netanyahu@demo.municipio360.test',
        createdAt: new Date('2026-04-09T11:05:00.000Z'),
      },
      {
        status: OccurrenceStatus.EM_TRATAMENTO,
        changedByEmail: 'ricardo.campanico@demo.municipio360.test',
        createdAt: new Date('2026-04-09T15:40:00.000Z'),
      },
    ],
    internalComments: [
      {
        authorEmail: 'ricardo.campanico@demo.municipio360.test',
        content: 'Agendada recolha extraordinaria para o turno da manha.',
        createdAt: new Date('2026-04-09T15:45:00.000Z'),
      },
    ],
  },
  {
    authorEmail: 'donald.trump@demo.municipio360.test',
    category: OccurrenceCategory.SINALIZACAO,
    description: 'Sinal de transito danificado junto ao cruzamento',
    location: 'Rua do Mercado, Faro',
    status: OccurrenceStatus.CONCLUIDA,
    createdAt: new Date('2026-04-02T10:00:00.000Z'),
    timeline: [
      {
        status: OccurrenceStatus.SUBMETIDA,
        changedByEmail: 'donald.trump@demo.municipio360.test',
        createdAt: new Date('2026-04-02T10:00:00.000Z'),
      },
      {
        status: OccurrenceStatus.EM_TRATAMENTO,
        changedByEmail: 'alan.martynyuk@demo.municipio360.test',
        createdAt: new Date('2026-04-02T12:30:00.000Z'),
      },
      {
        status: OccurrenceStatus.CONCLUIDA,
        changedByEmail: 'alan.martynyuk@demo.municipio360.test',
        createdAt: new Date('2026-04-04T16:20:00.000Z'),
      },
    ],
    internalComments: [
      {
        authorEmail: 'alan.martynyuk@demo.municipio360.test',
        content: 'Sinal removido e substituido pela equipa de sinalizacao.',
        createdAt: new Date('2026-04-04T16:25:00.000Z'),
      },
    ],
  },
  {
    authorEmail: 'lebron.james@demo.municipio360.test',
    category: OccurrenceCategory.ESPACOS_PUBLICOS,
    description: 'Banco de jardim solto depois de queda de ramo',
    location: 'Jardim da Alameda, Faro',
    status: OccurrenceStatus.CONCLUIDA,
    createdAt: new Date('2026-04-01T09:40:00.000Z'),
    timeline: [
      {
        status: OccurrenceStatus.SUBMETIDA,
        changedByEmail: 'lebron.james@demo.municipio360.test',
        createdAt: new Date('2026-04-01T09:40:00.000Z'),
      },
      {
        status: OccurrenceStatus.EM_TRATAMENTO,
        changedByEmail: 'david.domingos@demo.municipio360.test',
        createdAt: new Date('2026-04-01T13:00:00.000Z'),
      },
      {
        status: OccurrenceStatus.CONCLUIDA,
        changedByEmail: 'david.domingos@demo.municipio360.test',
        createdAt: new Date('2026-04-03T10:30:00.000Z'),
      },
    ],
    internalComments: [
      {
        authorEmail: 'david.domingos@demo.municipio360.test',
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

  await prisma.user.deleteMany({
    where: { email: { in: [...LEGACY_DEMO_EMAILS, ...DEMO_EMAILS] } },
  });

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
        avatarUrl: user.avatarUrl ?? null,
      },
      create: {
        ...user,
        passwordHash: hash,
        avatarUrl: user.avatarUrl ?? null,
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
