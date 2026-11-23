-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "googleId" TEXT,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Patient_googleId_key" ON "Patient"("googleId");