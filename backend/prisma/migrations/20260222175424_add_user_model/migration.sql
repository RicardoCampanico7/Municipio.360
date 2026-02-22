/*
  Warnings:

  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CertificationStatus" AS ENUM ('NONE', 'PENDING', 'CERTIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CIVIL', 'OPERADOR', 'ADMINISTRADOR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "certStatus" "CertificationStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'CIVIL',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
