-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "fileName" TEXT;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
