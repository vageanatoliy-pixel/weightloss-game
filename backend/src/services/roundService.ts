import { prisma } from '../prisma.js';
import { applyPercentCap, calcPercentReal, orderLeaderboard, pointsFromScheme } from '../utils/scoring.js';

export const recalcRoundResults = async (roundId: string): Promise<void> => {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { game: true },
  });
  if (!round) return;

  const members = await prisma.gameMember.findMany({
    where: { gameId: round.gameId, isActive: true },
    include: { user: true },
  });

  const scheme = JSON.parse(round.game.pointsScheme) as { steps: { threshold: number; points: number }[] };

  const candidateRows: {
    userId: string;
    startWeightKg: number;
    endWeightKg: number;
    percentReal: number;
    percentCapped: number;
    pointsAwarded: number;
    suspicious: boolean;
    firstWeighInTs: number;
  }[] = [];

  for (const member of members) {
    const endWeighIn = await prisma.weighIn.findUnique({
      where: { userId_roundId: { userId: member.userId, roundId: round.id } },
    });
    if (!endWeighIn) continue;

    const prevRound = await prisma.round.findFirst({
      where: {
        gameId: round.gameId,
        endAt: { lt: round.startAt },
      },
      orderBy: { endAt: 'desc' },
    });

    let startWeightKg = endWeighIn.weightKg;
    if (prevRound) {
      const prevWeighIn = await prisma.weighIn.findUnique({
        where: { userId_roundId: { userId: member.userId, roundId: prevRound.id } },
      });
      if (prevWeighIn) startWeightKg = prevWeighIn.weightKg;
    }

    const percentReal = calcPercentReal(startWeightKg, endWeighIn.weightKg);
    const percentCapped = applyPercentCap(percentReal, round.game.percentCap);
    const pointsAwarded = pointsFromScheme(percentCapped, scheme);
    const suspicious = percentReal > round.game.percentCap * 1.5 || !(endWeighIn.morning && endWeighIn.afterToilet && endWeighIn.noClothes);

    candidateRows.push({
      userId: member.userId,
      startWeightKg,
      endWeightKg: endWeighIn.weightKg,
      percentReal,
      percentCapped,
      pointsAwarded,
      suspicious,
      firstWeighInTs: endWeighIn.takenAt.getTime(),
    });
  }

  const ordered = orderLeaderboard(
    candidateRows.map((row) => ({
      userId: row.userId,
      totalPoints: row.pointsAwarded,
      totalPercentCapped: row.percentCapped,
      ifStreak: 0,
      firstWeighInTs: row.firstWeighInTs,
    })),
  );

  const rankByUser = new Map<string, number>();
  ordered.forEach((row, idx) => rankByUser.set(row.userId, idx + 1));

  await prisma.$transaction([
    prisma.roundResult.deleteMany({ where: { roundId } }),
    ...candidateRows.map((row) =>
      prisma.roundResult.create({
        data: {
          roundId,
          userId: row.userId,
          startWeightKg: row.startWeightKg,
          endWeightKg: row.endWeightKg,
          percentReal: row.percentReal,
          percentCapped: row.percentCapped,
          pointsAwarded: row.pointsAwarded,
          rank: rankByUser.get(row.userId) ?? 999,
          suspicious: row.suspicious,
        },
      }),
    ),
    prisma.weighIn.updateMany({
      where: { roundId },
      data: { locked: true },
    }),
  ]);
};
