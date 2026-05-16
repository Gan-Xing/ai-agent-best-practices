-- CreateTable
CREATE TABLE "github_repo_upstreams" (
    "id" TEXT NOT NULL,
    "host" TEXT NOT NULL DEFAULT 'github',
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "repoUrl" TEXT,
    "description" TEXT,
    "homepage" TEXT,
    "stars" INTEGER,
    "primaryLanguage" TEXT,
    "dominantLanguages" JSONB,
    "license" TEXT,
    "topics" JSONB,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "defaultBranch" TEXT,
    "pushedAt" TIMESTAMP(3),
    "lastFetchedAt" TIMESTAMP(3),
    "readmeTitle" TEXT,
    "readmeIntro" TEXT,
    "readmeHeadings" JSONB,
    "rootEntries" JSONB,
    "rootManifests" JSONB,
    "metadata" JSONB,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_repo_upstreams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "github_repo_upstreams_fullName_key" ON "github_repo_upstreams"("fullName");

-- CreateIndex
CREATE INDEX "github_repo_upstreams_owner_name_idx" ON "github_repo_upstreams"("owner", "name");

-- CreateIndex
CREATE INDEX "github_repo_upstreams_stars_idx" ON "github_repo_upstreams"("stars");

-- CreateIndex
CREATE INDEX "github_repo_upstreams_pushedAt_idx" ON "github_repo_upstreams"("pushedAt");

-- CreateIndex
CREATE INDEX "github_repo_upstreams_lastFetchedAt_idx" ON "github_repo_upstreams"("lastFetchedAt");
