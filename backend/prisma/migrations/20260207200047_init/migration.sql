-- CreateTable
CREATE TABLE "Exam" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subject" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "time" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AssignmentSubmission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assignmentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssignmentSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AssignmentSubmission" ("assignmentId", "completed", "id", "userId") SELECT "assignmentId", "completed", "id", "userId" FROM "AssignmentSubmission";
DROP TABLE "AssignmentSubmission";
ALTER TABLE "new_AssignmentSubmission" RENAME TO "AssignmentSubmission";
CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_userId_key" ON "AssignmentSubmission"("assignmentId", "userId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
