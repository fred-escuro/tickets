-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "appName" TEXT NOT NULL DEFAULT 'TicketHub',
    "appLogoUrl" TEXT,
    "companyName" TEXT NOT NULL DEFAULT '',
    "companyEmail" TEXT NOT NULL DEFAULT '',
    "companyPhone" TEXT,
    "companyAddress" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "language" TEXT NOT NULL DEFAULT 'en',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "businessHours" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);


