import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OccurrenceStatus } from '@prisma/client';
import { CreateOccurrenceDto } from './dto/create-occurrence.dto';

@Injectable()
export class OccurrencesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateOccurrenceDto) {
    return this.prisma.occurrence.create({
      data: {
        category: dto.category,
        description: dto.description,
        location: dto.location,
        imageUrls: dto.imageUrls ?? [],
        status: OccurrenceStatus.SUBMETIDA,
        userId,
      },
      select: {
        id: true,
        category: true,
        description: true,
        location: true,
        imageUrls: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
    });
  }

  async findAll() {
    return this.prisma.occurrence.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        description: true,
        location: true,
        imageUrls: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findMine(userId: number) {
    return this.prisma.occurrence.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        description: true,
        location: true,
        imageUrls: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: number) {
    const occurrence = await this.prisma.occurrence.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!occurrence) {
      throw new NotFoundException('Occurrence not found');
    }

    return occurrence;
  }

  async findOneOwned(id: number, userId: number) {
    const occurrence = await this.prisma.occurrence.findUnique({
      where: { id },
    });

    if (!occurrence) {
      throw new NotFoundException('Occurrence not found');
    }

    if (occurrence.userId !== userId) {
      throw new ForbiddenException('Not your occurrence');
    }

    return occurrence;
  }

  async updateStatus(id: number, status: OccurrenceStatus) {
    await this.findOne(id);

    return this.prisma.occurrence.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        category: true,
        description: true,
        location: true,
        imageUrls: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.occurrence.delete({
      where: { id },
      select: {
        id: true,
        category: true,
        description: true,
        location: true,
        imageUrls: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
    });
  }

  async findOnePublic(id: number) {
    const occurrence = await this.prisma.occurrence.findUnique({
      where: { id },
      select: {
        id: true,
        category: true,
        description: true,
        location: true,
        status: true,
        imageUrls: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!occurrence) {
      throw new NotFoundException('Occurrence not found');
    }

    return occurrence;
  }
}