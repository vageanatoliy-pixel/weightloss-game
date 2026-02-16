import { describe, expect, it } from 'vitest';
import { applyPercentCap, calcPercentReal, orderLeaderboard, pointsFromScheme } from '../src/utils/scoring.js';

describe('scoring utils', () => {
  it('calculates percent correctly', () => {
    expect(calcPercentReal(100, 97)).toBe(3);
    expect(calcPercentReal(100, 101)).toBe(0);
  });

  it('applies cap logic', () => {
    expect(applyPercentCap(3.2, 2.5)).toBe(2.5);
    expect(applyPercentCap(1.2, 2.5)).toBe(1.2);
  });

  it('chooses points from scheme', () => {
    const scheme = {
      steps: [
        { threshold: 2.5, points: 10 },
        { threshold: 1.5, points: 7 },
        { threshold: 0.5, points: 4 },
      ],
    };
    expect(pointsFromScheme(2.6, scheme)).toBe(10);
    expect(pointsFromScheme(1.6, scheme)).toBe(7);
    expect(pointsFromScheme(0.6, scheme)).toBe(4);
  });

  it('orders leaderboard by totalScore, then percent, then streak', () => {
    const rows = [
      { userId: 'a', totalPoints: 10, totalPercentCapped: 3, ifStreak: 2, firstWeighInTs: 4 },
      { userId: 'b', totalPoints: 10, totalPercentCapped: 3, ifStreak: 3, firstWeighInTs: 3 },
      { userId: 'c', totalPoints: 11, totalPercentCapped: 1, ifStreak: 0, firstWeighInTs: 2 },
    ];

    expect(orderLeaderboard(rows).map((r) => r.userId)).toEqual(['b', 'a', 'c']);
  });
});
