/*
  Warnings:

  - You are about to drop the `Exam` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Exam";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AssignmentSubmission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assignmentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssignmentSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AssignmentSubmission" ("assignmentId", "completed", "id", "userId") SELECT "assignmentId", "completed", "id", "userId" FROM "AssignmentSubmission";
DROP TABLE "AssignmentSubmission";
ALTER TABLE "new_AssignmentSubmission" RENAME TO "AssignmentSubmission";
CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_userId_key" ON "AssignmentSubmission"("assignmentId", "userId");
CREATE TABLE "new_Assignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "deadline" DATETIME,
    "creatorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Assignment_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Assignment" ("createdAt", "creatorId", "deadline", "description", "id", "subject", "title") SELECT "createdAt", "creatorId", "deadline", "description", "id", "subject", "title" FROM "Assignment";
DROP TABLE "Assignment";
ALTER TABLE "new_Assignment" RENAME TO "Assignment";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
