import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

import { OccurrencesService } from './occurrences.service';
import { CreateOccurrenceDto } from './dto/create-occurrence.dto';

@ApiTags('occurrences')
@Controller('occurrences')
export class OccurrencesController {
  constructor(private readonly occurrencesService: OccurrencesService) {}

  // helper: tenta apanhar o id do utilizador do JWT (depende de como a tua jwtStrategy faz attach)
  private getUserId(req: Request): number {
    const u: any = (req as any).user;
    const id = u?.sub ?? u?.userId ?? u?.id;
    return Number(id);
  }

  // GET /occurrences (público)
  @Get()
  findAll() {
    return this.occurrencesService.findAll();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check do módulo de ocorrências' })
  @ApiResponse({ status: 200, description: 'OK' })
  health() {
    return { status: 'ok' };
  }

  // SCRUM-57: detalhe público
  @Get(':id')
  @ApiOperation({ summary: 'Detalhe público de uma ocorrência' })
  @ApiParam({ name: 'id', type: Number, description: 'ID da ocorrência' })
  @ApiResponse({ status: 200, description: 'Occurrence encontrada' })
  @ApiResponse({ status: 404, description: 'Occurrence não existe' })
  findOnePublic(@Param('id', ParseIntPipe) id: number) {
    return this.occurrencesService.findOnePublic(id);
  }

  // SCRUM-53: associar ocorrência ao utilizador autenticado (CIVIL) + SCRUM-51 (DTO com validações)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CIVIL)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar ocorrência (apenas CIVIL autenticado)' })
  @ApiBody({ type: CreateOccurrenceDto })
  @ApiResponse({ status: 201, description: 'Occurrence criada' })
  @ApiResponse({ status: 401, description: 'Sem autenticação' })
  @ApiResponse({ status: 403, description: 'Sem permissões (não é CIVIL)' })
  create(@Req() req: Request, @Body() dto: CreateOccurrenceDto) {
    const userId = this.getUserId(req);
    return this.occurrencesService.create(userId, dto);
  }

  // Extra útil: listar as minhas ocorrências (CIVIL)
  @Get('mine/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CIVIL)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar ocorrências do utilizador autenticado (CIVIL)' })
  @ApiResponse({ status: 200, description: 'Lista devolvida' })
  findMine(@Req() req: Request) {
    const userId = this.getUserId(req);
    return this.occurrencesService.findMine(userId);
  }
}