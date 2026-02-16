import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authMiddleware, adminOnly } from './middleware/auth.js';
import { config } from './config.js';
import { prisma } from './prisma.js';
import type { AuthRequest } from './types.js';
import { recalcRoundResults } from './services/roundService.js';
import { dateKey, minutesBetween } from './utils/date.js';
import { orderLeaderboard, totalScore } from './utils/scoring.js';

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
      if (isLocalhost || config.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  }),
);
app.use(express.json());

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nickname: z.string().min(2),
  avatarUrl: z.string().url().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const gameSchema = z.object({
  name: z.string().min(2),
  percentCap: z.number().positive().max(5).default(2.5),
  pointsScheme: z.object({
    steps: z.array(z.object({ threshold: z.number(), points: z.number().int() })).min(1),
  }),
});

const gameSettingsSchema = z.object({
  percentCap: z.number().positive().max(5).optional(),
  pointsScheme: z
    .object({
      steps: z.array(z.object({ threshold: z.number(), points: z.number().int() })).min(1),
    })
    .optional(),
});

const roundSchema = z.object({
  title: z.string().min(2),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: z.enum(['UPCOMING', 'ACTIVE']).default('UPCOMING'),
});

const weighInSchema = z.object({
  roundId: z.string(),
  weightKg: z.number().positive().max(500),
  conditions: z.object({
    morning: z.boolean(),
    afterToilet: z.boolean(),
    noClothes: z.boolean(),
  }),
});

const ifStartSchema = z.object({
  targetHours: z.number().min(4).max(36),
});

const caloriesDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  goalKcal: z.number().int().positive(),
  totalKcal: z.number().int().nonnegative().default(0),
  isTracked: z.boolean().default(false),
});

const caloriesEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(1),
  kcal: z.number().int().positive(),
  protein: z.number().nonnegative().optional(),
  fat: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
});

const settingsSchema = z.object({
  nickname: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional(),
  privacyCaloriesMode: z.enum(['PRIVATE', 'PUBLIC_CHECKMARK']).optional(),
  tdee: z
    .object({
      sex: z.string().optional(),
      age: z.number().int().positive().optional(),
      heightCm: z.number().positive().optional(),
      weightKgPrivate: z.number().positive().optional(),
      activityMultiplier: z.number().min(1.2).max(2.2).optional(),
    })
    .optional(),
});

const normalizeRole = (role: string): 'USER' | 'ADMIN' => (role === 'ADMIN' ? 'ADMIN' : 'USER');

const makeToken = (userId: string, role: string) =>
  jwt.sign({ userId, role: normalizeRole(role) }, config.jwtSecret, { expiresIn: '7d' });

const authed = (req: AuthRequest) => req.user?.userId ?? '';
const serializeGame = (game: { pointsScheme: string } & Record<string, unknown>) => ({
  ...game,
  pointsScheme: JSON.parse(game.pointsScheme) as { steps: { threshold: number; points: number }[] },
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return res.status(409).json({ error: 'Email already exists' });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      nickname: parsed.data.nickname,
      avatarUrl: parsed.data.avatarUrl,
      passwordHash,
    },
  });

  return res.status(201).json({
    token: makeToken(user.id, user.role),
    user: {
      id: user.id,
      nickname: user.nickname,
      email: user.email,
      role: user.role,
      privacyCaloriesMode: user.privacyCaloriesMode,
    },
  });
});

app.post('/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  return res.json({
    token: makeToken(user.id, user.role),
    user: {
      id: user.id,
      nickname: user.nickname,
      email: user.email,
      role: user.role,
      privacyCaloriesMode: user.privacyCaloriesMode,
    },
  });
});

app.use(authMiddleware);

app.get('/me', async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: authed(req) },
    include: { settings: true },
  });
  if (!user) return res.status(404).json({ error: 'Not found' });
  return res.json({
    id: user.id,
    nickname: user.nickname,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    privacyCaloriesMode: user.privacyCaloriesMode,
    settings: user.settings,
  });
});

app.patch('/me/settings', async (req: AuthRequest, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const userId = authed(req);
  const data = parsed.data;

  const userUpdate: Record<string, unknown> = {};
  if (data.nickname !== undefined) userUpdate.nickname = data.nickname;
  if (data.avatarUrl !== undefined) userUpdate.avatarUrl = data.avatarUrl;
  if (data.privacyCaloriesMode !== undefined) userUpdate.privacyCaloriesMode = data.privacyCaloriesMode;

  await prisma.user.update({ where: { id: userId }, data: userUpdate });

  if (data.tdee) {
    const { sex, age, heightCm, weightKgPrivate, activityMultiplier } = data.tdee;
    let tdeeGoalKcal: number | undefined;
    if (sex && age && heightCm && weightKgPrivate && activityMultiplier) {
      const bmr = sex === 'male'
        ? 10 * weightKgPrivate + 6.25 * heightCm - 5 * age + 5
        : 10 * weightKgPrivate + 6.25 * heightCm - 5 * age - 161;
      tdeeGoalKcal = Math.round(bmr * activityMultiplier);
    }

    await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        sex,
        age,
        heightCm,
        weightKgPrivate,
        activityMultiplier,
        tdeeGoalKcal,
      },
      update: {
        sex,
        age,
        heightCm,
        weightKgPrivate,
        activityMultiplier,
        ...(tdeeGoalKcal ? { tdeeGoalKcal } : {}),
      },
    });
  }

  return res.json({ ok: true });
});

app.get('/games', async (req: AuthRequest, res) => {
  const games = await prisma.gameMember.findMany({
    where: { userId: authed(req) },
    include: { game: true },
  });
  return res.json(games.map((g) => serializeGame(g.game)));
});

app.post('/games', adminOnly, async (req: AuthRequest, res) => {
  const parsed = gameSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const game = await prisma.game.create({
    data: {
      name: parsed.data.name,
      percentCap: parsed.data.percentCap,
      pointsScheme: JSON.stringify(parsed.data.pointsScheme),
      createdBy: authed(req),
      members: {
        create: {
          userId: authed(req),
        },
      },
    },
  });
  return res.status(201).json(serializeGame(game));
});

app.patch('/games/:id/settings', adminOnly, async (req, res) => {
  const parsed = gameSettingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const updated = await prisma.game.update({
    where: { id: req.params.id },
    data: {
      ...(parsed.data.percentCap !== undefined ? { percentCap: parsed.data.percentCap } : {}),
      ...(parsed.data.pointsScheme !== undefined ? { pointsScheme: JSON.stringify(parsed.data.pointsScheme) } : {}),
    },
  });

  return res.json(serializeGame(updated));
});

app.post('/games/:id/join', async (req: AuthRequest, res) => {
  const gameId = req.params.id;

  await prisma.gameMember.upsert({
    where: { userId_gameId: { userId: authed(req), gameId } },
    update: { isActive: true },
    create: { userId: authed(req), gameId },
  });

  return res.json({ ok: true });
});

app.post('/games/:id/rounds', adminOnly, async (req, res) => {
  const parsed = roundSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const round = await prisma.round.create({
    data: {
      gameId: req.params.id,
      title: parsed.data.title,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      status: parsed.data.status,
    },
  });

  return res.status(201).json(round);
});

app.patch('/rounds/:id/close', adminOnly, async (req, res) => {
  const roundId = req.params.id;
  await prisma.round.update({ where: { id: roundId }, data: { status: 'CLOSED' } });
  await recalcRoundResults(roundId);
  return res.json({ ok: true });
});

app.post('/games/:id/weighins', async (req: AuthRequest, res) => {
  const parsed = weighInSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const gameId = req.params.id;
  const userId = authed(req);

  const member = await prisma.gameMember.findUnique({ where: { userId_gameId: { userId, gameId } } });
  if (!member) return res.status(403).json({ error: 'Join the game first' });

  const round = await prisma.round.findUnique({ where: { id: parsed.data.roundId } });
  if (!round || round.gameId !== gameId) return res.status(404).json({ error: 'Round not found' });

  const now = new Date();
  if (now > round.endAt || round.status === 'CLOSED') {
    return res.status(400).json({ error: 'Round closed, editing disabled' });
  }

  const suspicious = !(parsed.data.conditions.morning && parsed.data.conditions.afterToilet && parsed.data.conditions.noClothes);
  const existing = await prisma.weighIn.findUnique({
    where: { userId_roundId: { userId, roundId: parsed.data.roundId } },
  });

  if (!existing) {
    const created = await prisma.weighIn.create({
      data: {
        userId,
        gameId,
        roundId: parsed.data.roundId,
        weightKg: parsed.data.weightKg,
        morning: parsed.data.conditions.morning,
        afterToilet: parsed.data.conditions.afterToilet,
        noClothes: parsed.data.conditions.noClothes,
        suspicious,
      },
    });
    return res.status(201).json({
      id: created.id,
      roundId: created.roundId,
      weightKg: created.weightKg,
      editedCount: created.editedCount,
      suspicious: created.suspicious,
      warning: suspicious ? 'Conditions incomplete, marked suspicious' : null,
    });
  }

  if (existing.editedCount >= 1) {
    return res.status(400).json({ error: 'Only one edit is allowed before deadline' });
  }

  const updated = await prisma.weighIn.update({
    where: { id: existing.id },
    data: {
      weightKg: parsed.data.weightKg,
      morning: parsed.data.conditions.morning,
      afterToilet: parsed.data.conditions.afterToilet,
      noClothes: parsed.data.conditions.noClothes,
      editedCount: { increment: 1 },
      suspicious,
    },
  });

  await prisma.weighInEditLog.create({ data: { weighInId: updated.id, userId } });

  return res.json({
    id: updated.id,
    roundId: updated.roundId,
    weightKg: updated.weightKg,
    editedCount: updated.editedCount,
    suspicious: updated.suspicious,
    warning: suspicious ? 'Conditions incomplete, marked suspicious' : null,
  });
});

app.get('/rounds/:id/results', async (req: AuthRequest, res) => {
  const roundId = req.params.id;
  const me = authed(req);

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { game: true },
  });
  if (!round) return res.status(404).json({ error: 'Round not found' });

  const myMembership = await prisma.gameMember.findUnique({
    where: { userId_gameId: { userId: me, gameId: round.gameId } },
  });
  if (!myMembership) return res.status(403).json({ error: 'Forbidden' });

  const members = await prisma.gameMember.findMany({
    where: { gameId: round.gameId, isActive: true },
    include: { user: true },
  });

  const results = await prisma.roundResult.findMany({
    where: { roundId },
    include: { user: true },
    orderBy: { rank: 'asc' },
  });

  const submitted = new Set(results.map((r) => r.userId));

  return res.json({
    round: {
      id: round.id,
      title: round.title,
      status: round.status,
      startAt: round.startAt,
      endAt: round.endAt,
    },
    results: results.map((r) => ({
      userId: r.userId,
      nickname: r.user.nickname,
      rank: r.rank,
      points: r.pointsAwarded,
      percentCapped: r.percentCapped,
      percentReal: r.userId === me ? r.percentReal : null,
      suspicious: r.suspicious,
    })),
    notSubmitted: members.filter((m) => !submitted.has(m.userId)).map((m) => ({ userId: m.userId, nickname: m.user.nickname })),
  });
});

app.get('/games/:id/leaderboard', async (req: AuthRequest, res) => {
  const gameId = req.params.id;
  const me = authed(req);
  const today = dateKey(new Date());

  const myMembership = await prisma.gameMember.findUnique({ where: { userId_gameId: { userId: me, gameId } } });
  if (!myMembership) return res.status(403).json({ error: 'Forbidden' });

  const members = await prisma.gameMember.findMany({
    where: { gameId, isActive: true },
    include: {
      user: true,
      game: true,
    },
  });

  const results = await prisma.roundResult.findMany({
    where: { round: { gameId } },
  });

  const ifTodayStats = await prisma.iFDayStat.findMany({ where: { gameId, date: today } });
  const calorieDays = await prisma.calorieDay.findMany({ where: { date: today } });
  const latestRound = await prisma.round.findFirst({ where: { gameId }, orderBy: { endAt: 'desc' } });
  const latestRoundResults = latestRound
    ? await prisma.roundResult.findMany({ where: { roundId: latestRound.id } })
    : [];

  const rows = members.map((m) => {
    const userResults = results.filter((r) => r.userId === m.userId);
    const totalPoints = userResults.reduce((sum, r) => sum + r.pointsAwarded, 0);
    const totalPercentCapped = Number(userResults.reduce((sum, r) => sum + r.percentCapped, 0).toFixed(3));

    const streak = ifTodayStats.find((s) => s.userId === m.userId)?.streak ?? 0;
    const firstWeighInTs = 0;

    const latest = latestRoundResults.find((r) => r.userId === m.userId);
    const ifToday = ifTodayStats.find((s) => s.userId === m.userId);
    const calToday = calorieDays.find((c) => c.userId === m.userId);

    return {
      userId: m.userId,
      nickname: m.user.nickname,
      totalPoints,
      totalPercentCapped,
      roundPercentCapped: latest?.percentCapped ?? 0,
      roundPoints: latest?.pointsAwarded ?? 0,
      ifTodayMinutes: ifToday?.fastingMinutes ?? 0,
      ifTargetMinutes: ifToday?.targetMinutes ?? 0,
      ifStreak: streak,
      calorieTrackedPublic: m.user.privacyCaloriesMode === 'PUBLIC_CHECKMARK' ? (calToday?.isTracked ?? false) : null,
      firstWeighInTs,
    };
  });

  const ordered = orderLeaderboard(
    rows.map((r) => ({
      userId: r.userId,
      totalPoints: r.totalPoints,
      totalPercentCapped: r.totalPercentCapped,
      ifStreak: r.ifStreak,
      firstWeighInTs: r.firstWeighInTs,
    })),
  );

  const rankMap = new Map(ordered.map((r, idx) => [r.userId, idx + 1]));

  return res.json(
    rows
      .map((r) => ({
        rank: rankMap.get(r.userId),
        userId: r.userId,
        nickname: r.nickname,
        totalPoints: r.totalPoints,
        totalPercentCapped: r.totalPercentCapped,
        totalScore: totalScore(r.totalPoints, r.totalPercentCapped),
        roundPercentCapped: r.roundPercentCapped,
        roundPoints: r.roundPoints,
        ifTodayProgress: `${(r.ifTodayMinutes / 60).toFixed(1)}/${(r.ifTargetMinutes / 60).toFixed(1)}h`,
        ifStreak: r.ifStreak,
        calorieTracked: r.calorieTrackedPublic,
      }))
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)),
  );
});

app.post('/games/:id/if/start', async (req: AuthRequest, res) => {
  const parsed = ifStartSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const gameId = req.params.id;
  const userId = authed(req);

  const active = await prisma.iFSession.findFirst({
    where: { userId, gameId, status: 'FASTING', endedAt: null },
  });
  if (active) return res.status(400).json({ error: 'Fasting session already active' });

  const session = await prisma.iFSession.create({
    data: {
      userId,
      gameId,
      startedAt: new Date(),
      targetHours: parsed.data.targetHours,
      status: 'FASTING',
    },
  });

  return res.status(201).json(session);
});

app.post('/games/:id/if/finish', async (req: AuthRequest, res) => {
  const gameId = req.params.id;
  const userId = authed(req);

  const active = await prisma.iFSession.findFirst({
    where: { userId, gameId, status: 'FASTING', endedAt: null },
    orderBy: { startedAt: 'desc' },
  });
  if (!active) return res.status(404).json({ error: 'No active fasting session' });

  const endedAt = new Date();
  const durationMinutes = minutesBetween(active.startedAt, endedAt);
  const today = dateKey(endedAt);
  const targetMinutes = Math.round(active.targetHours * 60);

  const prevDay = new Date(endedAt);
  prevDay.setDate(prevDay.getDate() - 1);
  const prevStat = await prisma.iFDayStat.findUnique({
    where: { userId_gameId_date: { userId, gameId, date: dateKey(prevDay) } },
  });

  const stat = await prisma.iFDayStat.upsert({
    where: { userId_gameId_date: { userId, gameId, date: today } },
    create: {
      userId,
      gameId,
      date: today,
      fastingMinutes: durationMinutes,
      targetMinutes,
      isComplete: durationMinutes >= targetMinutes,
      streak: durationMinutes >= targetMinutes ? (prevStat?.streak ?? 0) + 1 : 0,
    },
    update: {
      fastingMinutes: { increment: durationMinutes },
      targetMinutes,
    },
  });

  const recalculatedComplete = stat.fastingMinutes >= targetMinutes;
  const streak = recalculatedComplete ? (prevStat?.streak ?? 0) + 1 : 0;

  await prisma.iFDayStat.update({
    where: { id: stat.id },
    data: {
      isComplete: recalculatedComplete,
      streak,
    },
  });

  const session = await prisma.iFSession.update({
    where: { id: active.id },
    data: {
      endedAt,
      durationMinutes,
      status: 'EATING',
      streakDay: streak,
    },
  });

  return res.json({
    id: session.id,
    durationMinutes,
    status: session.status,
    streak,
  });
});

app.get('/games/:id/if/today', async (req: AuthRequest, res) => {
  const gameId = req.params.id;
  const userId = authed(req);
  const today = dateKey(new Date());

  const active = await prisma.iFSession.findFirst({
    where: { userId, gameId, status: 'FASTING', endedAt: null },
    orderBy: { startedAt: 'desc' },
  });
  const last = await prisma.iFSession.findFirst({
    where: { userId, gameId, endedAt: { not: null } },
    orderBy: { endedAt: 'desc' },
  });
  const stat = await prisma.iFDayStat.findUnique({
    where: { userId_gameId_date: { userId, gameId, date: today } },
  });

  const runningMinutes = active ? minutesBetween(active.startedAt, new Date()) : 0;
  const totalMinutes = (stat?.fastingMinutes ?? 0) + runningMinutes;
  const targetMinutes = stat?.targetMinutes ?? (active ? Math.round(active.targetHours * 60) : 960);

  return res.json({
    status: active ? 'FASTING' : 'EATING',
    targetHours: Number((targetMinutes / 60).toFixed(1)),
    todayProgressHours: Number((totalMinutes / 60).toFixed(2)),
    streak: stat?.streak ?? last?.streakDay ?? 0,
    lastDurationMinutes: last?.durationMinutes ?? 0,
    activeStartedAt: active?.startedAt ?? null,
  });
});

app.post('/calories/day', async (req: AuthRequest, res) => {
  const parsed = caloriesDaySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const userId = authed(req);

  const day = await prisma.calorieDay.upsert({
    where: { userId_date: { userId, date: parsed.data.date } },
    create: {
      userId,
      date: parsed.data.date,
      goalKcal: parsed.data.goalKcal,
      totalKcal: parsed.data.totalKcal,
      isTracked: parsed.data.isTracked,
    },
    update: {
      goalKcal: parsed.data.goalKcal,
      totalKcal: parsed.data.totalKcal,
      isTracked: parsed.data.isTracked,
    },
  });

  return res.status(201).json(day);
});

app.post('/calories/entry', async (req: AuthRequest, res) => {
  const parsed = caloriesEntrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const userId = authed(req);

  const entry = await prisma.calorieEntry.create({
    data: {
      userId,
      date: parsed.data.date,
      name: parsed.data.name,
      kcal: parsed.data.kcal,
      protein: parsed.data.protein,
      fat: parsed.data.fat,
      carbs: parsed.data.carbs,
    },
  });

  await prisma.calorieDay.upsert({
    where: { userId_date: { userId, date: parsed.data.date } },
    create: {
      userId,
      date: parsed.data.date,
      goalKcal: 2000,
      totalKcal: parsed.data.kcal,
      isTracked: true,
    },
    update: {
      totalKcal: { increment: parsed.data.kcal },
      isTracked: true,
    },
  });

  return res.status(201).json(entry);
});

app.get('/calories/day/:date', async (req: AuthRequest, res) => {
  const userId = authed(req);
  const date = req.params.date;

  const day = await prisma.calorieDay.findUnique({ where: { userId_date: { userId, date } } });
  const entries = await prisma.calorieEntry.findMany({
    where: { userId, date },
    orderBy: { id: 'desc' },
  });

  return res.json({ day, entries });
});

app.get('/games/:id/rounds', async (req: AuthRequest, res) => {
  const userId = authed(req);
  const gameId = req.params.id;
  const member = await prisma.gameMember.findUnique({ where: { userId_gameId: { userId, gameId } } });
  if (!member) return res.status(403).json({ error: 'Forbidden' });

  const rounds = await prisma.round.findMany({ where: { gameId }, orderBy: { startAt: 'asc' } });
  return res.json(rounds);
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
});

export { app };
