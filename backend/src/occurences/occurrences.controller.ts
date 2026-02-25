import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role, OccurrenceStatus } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

import { OccurrencesService } from './occurrences.service';
import { CreateOccurrenceDto } from './dto/create-occurrence.dto';
import { UpdateOccurrenceStatusDto } from './dto/update-occurrence-status.dto';

@Controller('occurrences')
export class OccurrencesController {
  constructor(private readonly occurrencesService: OccurrencesService) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  // helper: tenta apanhar o id do utilizador do JWT (depende de como a tua JwtStrategy devolve o payload)
  private getUserId(req: Request): number {
    const u: any = (req as any).user;
    const id = u?.sub ?? u?.userId ?? u?.id;
    return Number(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CIVIL)
  create(@Req() req: Request, @Body() dto: CreateOccurrenceDto) {
    const userId = this.getUserId(req);
    return this.occurrencesService.create(userId, dto);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CIVIL)
  findMine(@Req() req: Request) {
    const userId = this.getUserId(req);
    return this.occurrencesService.findMine(userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OPERADOR, Role.ADMINISTRADOR)
  findAll() {
    return this.occurrencesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CIVIL)
  findOneOwned(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const userId = this.getUserId(req);
    return this.occurrencesService.findOneOwned(id, userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OPERADOR, Role.ADMINISTRADOR)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOccurrenceStatusDto,
  ) {
    return this.occurrencesService.updateStatus(id, dto.status as OccurrenceStatus);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMINISTRADOR)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.occurrencesService.remove(id);
  }
}