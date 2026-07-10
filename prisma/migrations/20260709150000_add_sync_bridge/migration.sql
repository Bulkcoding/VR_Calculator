CREATE TABLE "BrokerConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "broker" TEXT NOT NULL,
  "accountNoMasked" TEXT,
  "status" TEXT NOT NULL DEFAULT 'connected',
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BrokerConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SyncRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "broker" TEXT,
  "status" TEXT NOT NULL DEFAULT 'requested',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "bridgeTokenHash" TEXT NOT NULL,
  "bridgeTokenExpiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SyncRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrokerConnection_userId_broker_key" ON "BrokerConnection"("userId", "broker");
CREATE INDEX "BrokerConnection_userId_idx" ON "BrokerConnection"("userId");
CREATE INDEX "BrokerConnection_userId_status_idx" ON "BrokerConnection"("userId", "status");
CREATE INDEX "SyncRequest_userId_status_idx" ON "SyncRequest"("userId", "status");
CREATE INDEX "SyncRequest_bridgeTokenExpiresAt_idx" ON "SyncRequest"("bridgeTokenExpiresAt");

ALTER TABLE "BrokerConnection"
  ADD CONSTRAINT "BrokerConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SyncRequest"
  ADD CONSTRAINT "SyncRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

