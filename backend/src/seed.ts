import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
import { recalcRoundResults } from './services/roundService.js';

const defaultScheme = {
  steps: [
    { threshold: 2.5, points: 10 },
    { threshold: 1.5, points: 7 },
    { threshold: 0.5, points: 4 },
    { threshold: 0.0, points: 1 },
  ],
};

async function main() {
  const password = await bcrypt.hash('password123', 10);
  const capitalize = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      nickname: 'Admin',
      passwordHash: password,
      role: 'ADMIN',
    },
  });

  const users = await Promise.all(
    ['anna', 'bob', 'carla', 'dmytro', 'eva'].map((name, i) =>
      prisma.user.upsert({
        where: { email: `${name}@demo.com` },
        update: {},
        create: {
          email: `${name}@demo.com`,
          nickname: capitalize(name),
          passwordHash: password,
          role: 'USER',
          privacyCaloriesMode: i % 2 === 0 ? 'PUBLIC_CHECKMARK' : 'PRIVATE',
        },
      }),
    ),
  );

  const game = await prisma.game.upsert({
    where: { id: 'demo-game-1' },
    update: {},
    create: {
      id: 'demo-game-1',
      name: 'WeightLoss Game Demo',
      percentCap: 2.5,
      pointsScheme: JSON.stringify(defaultScheme),
      createdBy: admin.id,
    },
  });

  const allUsers = [admin, ...users];
  for (const u of allUsers) {
    await prisma.gameMember.upsert({
      where: { userId_gameId: { userId: u.id, gameId: game.id } },
      update: { isActive: true },
      create: { userId: u.id, gameId: game.id },
    });
  }

  const now = new Date();
  const round1Start = new Date(now);
  round1Start.setDate(now.getDate() - 28);
  const round1End = new Date(now);
  round1End.setDate(now.getDate() - 14);

  const round2Start = new Date(now);
  round2Start.setDate(now.getDate() - 13);
  const round2End = new Date(now);
  round2End.setDate(now.getDate() + 1);

  const round1 = await prisma.round.upsert({
    where: { id: 'demo-round-1' },
    update: {},
    create: {
      id: 'demo-round-1',
      gameId: game.id,
      title: 'Round 1',
      startAt: round1Start,
      endAt: round1End,
      status: 'CLOSED',
    },
  });

  const round2 = await prisma.round.upsert({
    where: { id: 'demo-round-2' },
    update: {},
    create: {
      id: 'demo-round-2',
      gameId: game.id,
      title: 'Round 2',
      startAt: round2Start,
      endAt: round2End,
      status: 'ACTIVE',
    },
  });

  const weights1 = [98, 90, 83, 101, 75, 88];
  const weights2 = [96.5, 88.2, 81.8, 98.4, 73.5, 86.1];

  for (let i = 0; i < allUsers.length; i += 1) {
    const user = allUsers[i];
    const weight1 = weights1[i];
    const weight2 = weights2[i];
    if (!user || weight1 === undefined || weight2 === undefined) {
      throw new Error(`Seed data mismatch at index ${i}`);
    }

    await prisma.weighIn.upsert({
      where: { userId_roundId: { userId: user.id, roundId: round1.id } },
      update: {},
      create: {
        userId: user.id,
        gameId: game.id,
        roundId: round1.id,
        weightKg: weight1,
        morning: true,
        afterToilet: true,
        noClothes: true,
        locked: true,
      },
    });

    await prisma.weighIn.upsert({
      where: { userId_roundId: { userId: user.id, roundId: round2.id } },
      update: {},
      create: {
        userId: user.id,
        gameId: game.id,
        roundId: round2.id,
        weightKg: weight2,
        morning: i % 2 === 0,
        afterToilet: true,
        noClothes: i % 3 !== 0,
      },
    });
  }

  await recalcRoundResults(round1.id);
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
