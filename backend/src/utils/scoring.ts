export type PointsStep = { threshold: number; points: number };

export type PointsScheme = {
  steps: PointsStep[];
};

export const calcPercentReal = (startWeightKg: number, endWeightKg: number): number => {
  if (startWeightKg <= 0) return 0;
  const value = ((startWeightKg - endWeightKg) / startWeightKg) * 100;
  return Number(Math.max(0, value).toFixed(3));
};

export const applyPercentCap = (percentReal: number, percentCap: number): number => {
  return Number(Math.min(Math.max(percentReal, 0), percentCap).toFixed(3));
};

export const pointsFromScheme = (percentCapped: number, scheme: PointsScheme): number => {
  const sorted = [...scheme.steps].sort((a, b) => b.threshold - a.threshold);
  const found = sorted.find((s) => percentCapped >= s.threshold);
  return found?.points ?? 0;
};

export const totalScore = (totalPoints: number, totalPercentCapped: number): number => {
  return Number((totalPoints + totalPercentCapped).toFixed(3));
};

export type LeaderRow = {
  userId: string;
  totalPoints: number;
  totalPercentCapped: number;
  ifStreak: number;
  firstWeighInTs: number;
};

export const orderLeaderboard = (rows: LeaderRow[]): LeaderRow[] => {
  return [...rows].sort((a, b) => {
    const scoreDiff = totalScore(b.totalPoints, b.totalPercentCapped) - totalScore(a.totalPoints, a.totalPercentCapped);
    if (scoreDiff !== 0) return scoreDiff;
    const percentDiff = b.totalPercentCapped - a.totalPercentCapped;
    if (percentDiff !== 0) return percentDiff;
    const streakDiff = b.ifStreak - a.ifStreak;
    if (streakDiff !== 0) return streakDiff;
    return a.firstWeighInTs - b.firstWeighInTs;
  });
};
