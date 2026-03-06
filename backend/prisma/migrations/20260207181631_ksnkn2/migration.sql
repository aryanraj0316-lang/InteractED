-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "rollNo" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnnouncementRead" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "announcementId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AnnouncementRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "deadline" DATETIME NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Assignment_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssignmentSubmission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assignmentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssignmentSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_rollNo_key" ON "User"("rollNo");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementRead_announcementId_userId_key" ON "AnnouncementRead"("announcementId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_userId_key" ON "AssignmentSubmission"("assignmentId", "userId");
