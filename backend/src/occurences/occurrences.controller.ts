import {
  BadRequestException,
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

  private getUserId(req: Request): number {
    const u: any = (req as any).user;
    const id = u?.sub ?? u?.userId ?? u?.id;
    const parsedId = Number(id);

    if (!parsedId || Number.isNaN(parsedId)) {
      throw new BadRequestException('Utilizador autenticado inválido');
    }

    return parsedId;
  }

  @Get()
  @ApiOperation({ summary: 'Listar ocorrências públicas' })
  @ApiResponse({ status: 200, description: 'Lista pública de ocorrências' })
  findAll() {
    return this.occurrencesService.findAll();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check do módulo de ocorrências' })
  @ApiResponse({ status: 200, description: 'OK' })
  health() {
    return { status: 'ok' };
  }

  @Get('mine/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CIVIL)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar ocorrências do utilizador autenticado (CIVIL)' })
  @ApiResponse({ status: 200, description: 'Lista devolvida' })
  @ApiResponse({ status: 401, description: 'Sem autenticação' })
  @ApiResponse({ status: 403, description: 'Sem permissões (não é CIVIL)' })
  findMine(@Req() req: Request) {
    const userId = this.getUserId(req);
    return this.occurrencesService.findMine(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe público de uma ocorrência' })
  @ApiParam({ name: 'id', type: Number, description: 'ID da ocorrência' })
  @ApiResponse({ status: 200, description: 'Ocorrência encontrada' })
  @ApiResponse({ status: 404, description: 'Ocorrência não existe' })
  findOnePublic(@Param('id', ParseIntPipe) id: number) {
    return this.occurrencesService.findOnePublic(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CIVIL)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar ocorrência (apenas CIVIL autenticado)' })
  @ApiBody({ type: CreateOccurrenceDto })
  @ApiResponse({ status: 201, description: 'Ocorrência criada' })
  @ApiResponse({ status: 401, description: 'Sem autenticação' })
  @ApiResponse({ status: 403, description: 'Sem permissões (não é CIVIL)' })
  create(@Req() req: Request, @Body() dto: CreateOccurrenceDto) {
    const userId = this.getUserId(req);
    return this.occurrencesService.create(userId, dto);
  }
}