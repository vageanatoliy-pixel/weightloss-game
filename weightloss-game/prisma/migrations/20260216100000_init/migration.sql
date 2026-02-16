-- This migration mirrors prisma/schema.prisma for initial setup.
PRAGMA foreign_keys=OFF;

CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nickname" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "privacyCaloriesMode" TEXT NOT NULL DEFAULT 'PRIVATE',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "UserSettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "sex" TEXT,
  "age" INTEGER,
  "heightCm" REAL,
  "weightKgPrivate" REAL,
  "activityMultiplier" REAL DEFAULT 1.2,
  "tdeeGoalKcal" INTEGER,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

CREATE TABLE "Game" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "percentCap" REAL NOT NULL DEFAULT 2.5,
  "pointsScheme" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "GameMember" (
  "userId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY ("userId", "gameId"),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Round" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "gameId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "startAt" DATETIME NOT NULL,
  "endAt" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UPCOMING',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "WeighIn" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "roundId" TEXT NOT NULL,
  "weightKg" REAL NOT NULL,
  "takenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "morning" BOOLEAN NOT NULL,
  "afterToilet" BOOLEAN NOT NULL,
  "noClothes" BOOLEAN NOT NULL,
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "editedCount" INTEGER NOT NULL DEFAULT 0,
  "suspicious" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WeighIn_userId_roundId_key" ON "WeighIn"("userId", "roundId");
CREATE INDEX "WeighIn_gameId_roundId_idx" ON "WeighIn"("gameId", "roundId");

CREATE TABLE "WeighInEditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "weighInId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "editedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RoundResult" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "roundId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startWeightKg" REAL NOT NULL,
  "endWeightKg" REAL NOT NULL,
  "percentReal" REAL NOT NULL,
  "percentCapped" REAL NOT NULL,
  "pointsAwarded" INTEGER NOT NULL,
  "rank" INTEGER NOT NULL,
  "suspicious" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RoundResult_roundId_userId_key" ON "RoundResult"("roundId", "userId");
CREATE INDEX "RoundResult_userId_idx" ON "RoundResult"("userId");

CREATE TABLE "IFSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "startedAt" DATETIME NOT NULL,
  "endedAt" DATETIME,
  "targetHours" REAL NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'FASTING',
  "durationMinutes" INTEGER NOT NULL DEFAULT 0,
  "streakDay" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "IFSession_userId_gameId_idx" ON "IFSession"("userId", "gameId");

CREATE TABLE "IFDayStat" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "fastingMinutes" INTEGER NOT NULL,
  "targetMinutes" INTEGER NOT NULL,
  "streak" INTEGER NOT NULL DEFAULT 0,
  "isComplete" BOOLEAN NOT NULL DEFAULT false,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "IFDayStat_userId_gameId_date_key" ON "IFDayStat"("userId", "gameId", "date");

CREATE TABLE "CalorieDay" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "goalKcal" INTEGER NOT NULL,
  "totalKcal" INTEGER NOT NULL DEFAULT 0,
  "isTracked" BOOLEAN NOT NULL DEFAULT false,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CalorieDay_userId_date_key" ON "CalorieDay"("userId", "date");

CREATE TABLE "CalorieEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kcal" INTEGER NOT NULL,
  "protein" REAL,
  "fat" REAL,
  "carbs" REAL,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CalorieEntry_userId_date_idx" ON "CalorieEntry"("userId", "date");

PRAGMA foreign_keys=ON;
