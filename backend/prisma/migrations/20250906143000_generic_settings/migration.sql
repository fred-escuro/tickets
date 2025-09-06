-- CreateTable: app_settings
CREATE TABLE "app_settings" (
  "id" TEXT PRIMARY KEY,
  "namespace" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'JSON',
  "isSecret" BOOLEAN NOT NULL DEFAULT FALSE,
  "description" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "app_settings_namespace_key_key" ON "app_settings" ("namespace", "key");
CREATE INDEX "app_settings_namespace_idx" ON "app_settings" ("namespace");

-- CreateTable: setting_history
CREATE TABLE "setting_history" (
  "id" TEXT PRIMARY KEY,
  "namespace" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB,
  "changedBy" TEXT,
  "reason" TEXT,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "setting_history_ns_key_idx" ON "setting_history" ("namespace", "key");


