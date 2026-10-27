CREATE TABLE "quote_confirmation_emails" (
  "quoteRequestId" TEXT NOT NULL PRIMARY KEY,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "firstAttemptAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "providerMessageId" TEXT,
  "sentAt" TIMESTAMP(3),
  "lastError" TEXT,
  CONSTRAINT "quote_confirmation_emails_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "quote_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "quote_confirmation_emails_status_check" CHECK ("status" IN ('pending', 'sent', 'failed', 'review')),
  CONSTRAINT "quote_confirmation_emails_attempts_check" CHECK ("attempts" >= 0)
);

CREATE INDEX "quote_confirmation_emails_status_nextAttemptAt_idx" ON "quote_confirmation_emails"("status", "nextAttemptAt");
