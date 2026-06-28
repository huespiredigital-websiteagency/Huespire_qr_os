-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "maxStaff" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "maxStaff" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "invitedById" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
