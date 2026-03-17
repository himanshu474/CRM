/*
  Warnings:

  - Added the required column `storagePath` to the `Attachment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "storagePath" TEXT NOT NULL;
