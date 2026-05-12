-- CreateEnum
CREATE TYPE "RecordVisibility" AS ENUM ('PUBLIC', 'INTERNAL', 'PRIVATE');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RecordMaturity" AS ENUM ('SEED', 'REVIEWED', 'VALIDATED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "RecordFreshness" AS ENUM ('UNKNOWN', 'FRESH', 'STALE', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED', 'CANCELED');

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "knowledge_records" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalKey" TEXT,
    "externalId" TEXT,
    "checksum" TEXT,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "type" TEXT NOT NULL DEFAULT 'NOTE',
    "categoryCode" TEXT NOT NULL,
    "visibility" "RecordVisibility" NOT NULL DEFAULT 'INTERNAL',
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "maturity" "RecordMaturity" NOT NULL DEFAULT 'SEED',
    "freshness" "RecordFreshness" NOT NULL DEFAULT 'UNKNOWN',
    "confidence" DOUBLE PRECISION DEFAULT 0.5,
    "language" TEXT NOT NULL DEFAULT 'zh',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT,
    "problem" TEXT,
    "recommendation" TEXT,
    "metadata" JSONB,
    "applicability" JSONB,
    "compatibility" JSONB,
    "tradeoffs" JSONB,
    "evidence" JSONB,
    "metrics" JSONB,
    "curation" JSONB,
    "extensions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "reviewAfter" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "knowledge_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary_terms" (
    "id" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelZh" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocabulary_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameZh" TEXT,
    "description" TEXT,
    "parentCode" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_translations" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT,
    "problem" TEXT,
    "recommendation" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "record_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_chunks" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "chunkNo" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'BODY',
    "language" TEXT NOT NULL DEFAULT 'zh',
    "text" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "record_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_search_indexes" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'zh',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT,
    "tags" TEXT,
    "aliases" TEXT,
    "keywords" TEXT,
    "contentHash" TEXT NOT NULL,
    "searchVector" tsvector,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "record_search_indexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameZh" TEXT,
    "description" TEXT,
    "parentId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_record_tags" (
    "recordId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_record_tags_pkey" PRIMARY KEY ("recordId","tagId")
);

-- CreateTable
CREATE TABLE "aliases" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'zh',
    "kind" TEXT NOT NULL DEFAULT 'ALIAS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keywords" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'zh',
    "weight" DOUBLE PRECISION DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT,
    "sourceType" TEXT NOT NULL,
    "uri" TEXT,
    "title" TEXT,
    "author" TEXT,
    "publisher" TEXT,
    "publishedAt" TIMESTAMP(3),
    "accessedAt" TIMESTAMP(3),
    "checksum" TEXT,
    "rawPayload" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_record_sources" (
    "recordId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'REFERENCE',
    "quote" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_record_sources_pkey" PRIMARY KEY ("recordId","sourceId","role")
);

-- CreateTable
CREATE TABLE "record_relations" (
    "id" TEXT NOT NULL,
    "fromRecordId" TEXT NOT NULL,
    "toRecordId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "strength" DOUBLE PRECISION DEFAULT 1,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "record_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_versions" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "changeType" TEXT NOT NULL DEFAULT 'UPDATE',
    "title" TEXT,
    "summary" TEXT,
    "body" TEXT,
    "snapshot" JSONB,
    "diff" JSONB,
    "createdBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_embeddings" (
    "id" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embedding" vector,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "record_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB,
    "stats" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_job_items" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "recordId" TEXT,
    "externalKey" TEXT,
    "externalId" TEXT,
    "slug" TEXT,
    "action" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "checksum" TEXT,
    "payload" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_job_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_index_jobs" (
    "id" TEXT NOT NULL,
    "recordId" TEXT,
    "language" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "reason" TEXT,
    "error" TEXT,
    "lockedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_index_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "embedding_jobs" (
    "id" TEXT NOT NULL,
    "recordId" TEXT,
    "chunkId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "error" TEXT,
    "lockedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "embedding_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'SYSTEM',
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_query_logs" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'SEARCH',
    "filters" JSONB,
    "resultCount" INTEGER,
    "topRecordIds" JSONB,
    "latencyMs" INTEGER,
    "userId" TEXT,
    "sessionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_logs" (
    "id" TEXT NOT NULL,
    "queryLogId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT,
    "answer" TEXT NOT NULL,
    "citations" JSONB,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costUsd" DOUBLE PRECISION,
    "latencyMs" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answer_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_result_logs" (
    "id" TEXT NOT NULL,
    "queryLogId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "chunkId" TEXT,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'HYBRID',
    "scores" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_result_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_feedback" (
    "id" TEXT NOT NULL,
    "queryLogId" TEXT,
    "answerId" TEXT,
    "recordId" TEXT,
    "chunkId" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "rating" INTEGER,
    "label" TEXT,
    "comment" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_records_slug_key" ON "knowledge_records"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_records_externalKey_key" ON "knowledge_records"("externalKey");

-- CreateIndex
CREATE INDEX "knowledge_records_type_idx" ON "knowledge_records"("type");

-- CreateIndex
CREATE INDEX "knowledge_records_maturity_idx" ON "knowledge_records"("maturity");

-- CreateIndex
CREATE INDEX "knowledge_records_freshness_idx" ON "knowledge_records"("freshness");

-- CreateIndex
CREATE INDEX "knowledge_records_language_idx" ON "knowledge_records"("language");

-- CreateIndex
CREATE INDEX "knowledge_records_confidence_idx" ON "knowledge_records"("confidence");

-- CreateIndex
CREATE INDEX "knowledge_records_externalId_idx" ON "knowledge_records"("externalId");

-- CreateIndex
CREATE INDEX "knowledge_records_checksum_idx" ON "knowledge_records"("checksum");

-- CreateIndex
CREATE INDEX "knowledge_records_updatedAt_idx" ON "knowledge_records"("updatedAt");

-- CreateIndex
CREATE INDEX "knowledge_records_lastVerifiedAt_idx" ON "knowledge_records"("lastVerifiedAt");

-- CreateIndex
CREATE INDEX "knowledge_records_reviewAfter_idx" ON "knowledge_records"("reviewAfter");

-- CreateIndex
CREATE INDEX "knowledge_records_categoryCode_type_idx" ON "knowledge_records"("categoryCode", "type");

-- CreateIndex
CREATE INDEX "knowledge_records_visibility_status_idx" ON "knowledge_records"("visibility", "status");

-- CreateIndex
CREATE INDEX "knowledge_records_status_maturity_idx" ON "knowledge_records"("status", "maturity");

-- CreateIndex
CREATE INDEX "knowledge_records_metadata_idx" ON "knowledge_records" USING GIN ("metadata");

-- CreateIndex
CREATE INDEX "vocabulary_terms_namespace_isActive_sortOrder_idx" ON "vocabulary_terms"("namespace", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_terms_namespace_code_key" ON "vocabulary_terms"("namespace", "code");

-- CreateIndex
CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentCode_idx" ON "categories"("parentCode");

-- CreateIndex
CREATE INDEX "categories_sortOrder_idx" ON "categories"("sortOrder");

-- CreateIndex
CREATE INDEX "categories_isActive_idx" ON "categories"("isActive");

-- CreateIndex
CREATE INDEX "record_translations_language_idx" ON "record_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "record_translations_recordId_language_key" ON "record_translations"("recordId", "language");

-- CreateIndex
CREATE INDEX "record_chunks_kind_idx" ON "record_chunks"("kind");

-- CreateIndex
CREATE INDEX "record_chunks_language_idx" ON "record_chunks"("language");

-- CreateIndex
CREATE INDEX "record_chunks_contentHash_idx" ON "record_chunks"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "record_chunks_recordId_chunkNo_kind_language_key" ON "record_chunks"("recordId", "chunkNo", "kind", "language");

-- CreateIndex
CREATE INDEX "record_search_indexes_language_idx" ON "record_search_indexes"("language");

-- CreateIndex
CREATE INDEX "record_search_indexes_contentHash_idx" ON "record_search_indexes"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "record_search_indexes_recordId_language_key" ON "record_search_indexes"("recordId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_name_idx" ON "tags"("name");

-- CreateIndex
CREATE INDEX "tags_parentId_idx" ON "tags"("parentId");

-- CreateIndex
CREATE INDEX "knowledge_record_tags_tagId_idx" ON "knowledge_record_tags"("tagId");

-- CreateIndex
CREATE INDEX "aliases_alias_idx" ON "aliases"("alias");

-- CreateIndex
CREATE INDEX "aliases_language_idx" ON "aliases"("language");

-- CreateIndex
CREATE UNIQUE INDEX "aliases_recordId_alias_language_kind_key" ON "aliases"("recordId", "alias", "language", "kind");

-- CreateIndex
CREATE INDEX "keywords_keyword_idx" ON "keywords"("keyword");

-- CreateIndex
CREATE INDEX "keywords_language_idx" ON "keywords"("language");

-- CreateIndex
CREATE UNIQUE INDEX "keywords_recordId_keyword_language_key" ON "keywords"("recordId", "keyword", "language");

-- CreateIndex
CREATE UNIQUE INDEX "sources_sourceKey_key" ON "sources"("sourceKey");

-- CreateIndex
CREATE INDEX "sources_sourceType_idx" ON "sources"("sourceType");

-- CreateIndex
CREATE INDEX "sources_uri_idx" ON "sources"("uri");

-- CreateIndex
CREATE INDEX "sources_checksum_idx" ON "sources"("checksum");

-- CreateIndex
CREATE INDEX "knowledge_record_sources_sourceId_idx" ON "knowledge_record_sources"("sourceId");

-- CreateIndex
CREATE INDEX "record_relations_toRecordId_idx" ON "record_relations"("toRecordId");

-- CreateIndex
CREATE INDEX "record_relations_relationType_idx" ON "record_relations"("relationType");

-- CreateIndex
CREATE UNIQUE INDEX "record_relations_fromRecordId_toRecordId_relationType_key" ON "record_relations"("fromRecordId", "toRecordId", "relationType");

-- CreateIndex
CREATE INDEX "record_versions_createdAt_idx" ON "record_versions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "record_versions_recordId_versionNo_key" ON "record_versions"("recordId", "versionNo");

-- CreateIndex
CREATE INDEX "record_embeddings_provider_model_idx" ON "record_embeddings"("provider", "model");

-- CreateIndex
CREATE UNIQUE INDEX "record_embeddings_chunkId_provider_model_contentHash_key" ON "record_embeddings"("chunkId", "provider", "model", "contentHash");

-- CreateIndex
CREATE INDEX "import_jobs_status_idx" ON "import_jobs"("status");

-- CreateIndex
CREATE INDEX "import_jobs_sourceType_idx" ON "import_jobs"("sourceType");

-- CreateIndex
CREATE INDEX "import_jobs_createdAt_idx" ON "import_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "import_job_items_jobId_status_idx" ON "import_job_items"("jobId", "status");

-- CreateIndex
CREATE INDEX "import_job_items_recordId_idx" ON "import_job_items"("recordId");

-- CreateIndex
CREATE INDEX "import_job_items_externalKey_idx" ON "import_job_items"("externalKey");

-- CreateIndex
CREATE INDEX "import_job_items_externalId_idx" ON "import_job_items"("externalId");

-- CreateIndex
CREATE INDEX "import_job_items_slug_idx" ON "import_job_items"("slug");

-- CreateIndex
CREATE INDEX "search_index_jobs_status_priority_createdAt_idx" ON "search_index_jobs"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "search_index_jobs_recordId_idx" ON "search_index_jobs"("recordId");

-- CreateIndex
CREATE INDEX "search_index_jobs_language_idx" ON "search_index_jobs"("language");

-- CreateIndex
CREATE INDEX "embedding_jobs_status_priority_createdAt_idx" ON "embedding_jobs"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "embedding_jobs_recordId_idx" ON "embedding_jobs"("recordId");

-- CreateIndex
CREATE INDEX "embedding_jobs_chunkId_idx" ON "embedding_jobs"("chunkId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "search_query_logs_mode_idx" ON "search_query_logs"("mode");

-- CreateIndex
CREATE INDEX "search_query_logs_userId_idx" ON "search_query_logs"("userId");

-- CreateIndex
CREATE INDEX "search_query_logs_sessionId_idx" ON "search_query_logs"("sessionId");

-- CreateIndex
CREATE INDEX "search_query_logs_createdAt_idx" ON "search_query_logs"("createdAt");

-- CreateIndex
CREATE INDEX "answer_logs_queryLogId_idx" ON "answer_logs"("queryLogId");

-- CreateIndex
CREATE INDEX "answer_logs_provider_model_idx" ON "answer_logs"("provider", "model");

-- CreateIndex
CREATE INDEX "answer_logs_createdAt_idx" ON "answer_logs"("createdAt");

-- CreateIndex
CREATE INDEX "search_result_logs_queryLogId_recordId_idx" ON "search_result_logs"("queryLogId", "recordId");

-- CreateIndex
CREATE INDEX "search_result_logs_recordId_idx" ON "search_result_logs"("recordId");

-- CreateIndex
CREATE INDEX "search_result_logs_chunkId_idx" ON "search_result_logs"("chunkId");

-- CreateIndex
CREATE INDEX "search_result_logs_source_idx" ON "search_result_logs"("source");

-- CreateIndex
CREATE UNIQUE INDEX "search_result_logs_queryLogId_rank_key" ON "search_result_logs"("queryLogId", "rank");

-- CreateIndex
CREATE INDEX "search_feedback_queryLogId_idx" ON "search_feedback"("queryLogId");

-- CreateIndex
CREATE INDEX "search_feedback_answerId_idx" ON "search_feedback"("answerId");

-- CreateIndex
CREATE INDEX "search_feedback_recordId_idx" ON "search_feedback"("recordId");

-- CreateIndex
CREATE INDEX "search_feedback_chunkId_idx" ON "search_feedback"("chunkId");

-- CreateIndex
CREATE INDEX "search_feedback_userId_idx" ON "search_feedback"("userId");

-- CreateIndex
CREATE INDEX "search_feedback_sessionId_idx" ON "search_feedback"("sessionId");

-- CreateIndex
CREATE INDEX "search_feedback_label_idx" ON "search_feedback"("label");

-- CreateIndex
CREATE INDEX "search_feedback_createdAt_idx" ON "search_feedback"("createdAt");

-- AddForeignKey
ALTER TABLE "knowledge_records" ADD CONSTRAINT "knowledge_records_categoryCode_fkey" FOREIGN KEY ("categoryCode") REFERENCES "categories"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentCode_fkey" FOREIGN KEY ("parentCode") REFERENCES "categories"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_translations" ADD CONSTRAINT "record_translations_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "knowledge_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_chunks" ADD CONSTRAINT "record_chunks_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "knowledge_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_search_indexes" ADD CONSTRAINT "record_search_indexes_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "knowledge_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_record_tags" ADD CONSTRAINT "knowledge_record_tags_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "knowledge_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_record_tags" ADD CONSTRAINT "knowledge_record_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aliases" ADD CONSTRAINT "aliases_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "knowledge_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "knowledge_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_record_sources" ADD CONSTRAINT "knowledge_record_sources_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "knowledge_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_record_sources" ADD CONSTRAINT "knowledge_record_sources_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_relations" ADD CONSTRAINT "record_relations_fromRecordId_fkey" FOREIGN KEY ("fromRecordId") REFERENCES "knowledge_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_relations" ADD CONSTRAINT "record_relations_toRecordId_fkey" FOREIGN KEY ("toRecordId") REFERENCES "knowledge_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_versions" ADD CONSTRAINT "record_versions_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "knowledge_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_embeddings" ADD CONSTRAINT "record_embeddings_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "record_chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_job_items" ADD CONSTRAINT "import_job_items_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_job_items" ADD CONSTRAINT "import_job_items_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "knowledge_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_index_jobs" ADD CONSTRAINT "search_index_jobs_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "knowledge_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "embedding_jobs" ADD CONSTRAINT "embedding_jobs_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "knowledge_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "embedding_jobs" ADD CONSTRAINT "embedding_jobs_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "record_chunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_logs" ADD CONSTRAINT "answer_logs_queryLogId_fkey" FOREIGN KEY ("queryLogId") REFERENCES "search_query_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_result_logs" ADD CONSTRAINT "search_result_logs_queryLogId_fkey" FOREIGN KEY ("queryLogId") REFERENCES "search_query_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_result_logs" ADD CONSTRAINT "search_result_logs_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "knowledge_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_result_logs" ADD CONSTRAINT "search_result_logs_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "record_chunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_feedback" ADD CONSTRAINT "search_feedback_queryLogId_fkey" FOREIGN KEY ("queryLogId") REFERENCES "search_query_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_feedback" ADD CONSTRAINT "search_feedback_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "answer_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_feedback" ADD CONSTRAINT "search_feedback_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "knowledge_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_feedback" ADD CONSTRAINT "search_feedback_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "record_chunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "record_embeddings"
ADD CONSTRAINT "record_embeddings_dimensions_positive_check"
CHECK ("dimensions" > 0);

-- AddCheckConstraint
ALTER TABLE "record_embeddings"
ADD CONSTRAINT "record_embeddings_embedding_dimensions_match_check"
CHECK ("embedding" IS NULL OR vector_dims("embedding") = "dimensions");

-- CreateFunction
CREATE FUNCTION "record_search_indexes_set_search_vector"() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('pg_catalog.simple', COALESCE(NEW."title", '')), 'A') ||
    setweight(to_tsvector('pg_catalog.simple', COALESCE(NEW."summary", '')), 'B') ||
    setweight(to_tsvector('pg_catalog.simple', COALESCE(NEW."body", '')), 'C') ||
    setweight(to_tsvector('pg_catalog.simple', COALESCE(NEW."tags", '')), 'B') ||
    setweight(to_tsvector('pg_catalog.simple', COALESCE(NEW."aliases", '')), 'B') ||
    setweight(to_tsvector('pg_catalog.simple', COALESCE(NEW."keywords", '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CreateTrigger
CREATE TRIGGER "record_search_indexes_set_search_vector_trigger"
BEFORE INSERT OR UPDATE OF "title", "summary", "body", "tags", "aliases", "keywords"
ON "record_search_indexes"
FOR EACH ROW
EXECUTE FUNCTION "record_search_indexes_set_search_vector"();

-- BackfillSearchVector
UPDATE "record_search_indexes"
SET "searchVector" =
  setweight(to_tsvector('pg_catalog.simple', COALESCE("title", '')), 'A') ||
  setweight(to_tsvector('pg_catalog.simple', COALESCE("summary", '')), 'B') ||
  setweight(to_tsvector('pg_catalog.simple', COALESCE("body", '')), 'C') ||
  setweight(to_tsvector('pg_catalog.simple', COALESCE("tags", '')), 'B') ||
  setweight(to_tsvector('pg_catalog.simple', COALESCE("aliases", '')), 'B') ||
  setweight(to_tsvector('pg_catalog.simple', COALESCE("keywords", '')), 'A');

-- CreateIndex
CREATE INDEX "record_search_indexes_searchVector_idx"
ON "record_search_indexes" USING GIN ("searchVector");

-- CreateIndex
CREATE INDEX "record_embeddings_embedding_1536_cosine_idx"
ON "record_embeddings"
USING ivfflat ((("embedding")::vector(1536)) vector_cosine_ops)
WITH (lists = 100)
WHERE "embedding" IS NOT NULL AND "dimensions" = 1536;
