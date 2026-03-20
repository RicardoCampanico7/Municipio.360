import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UseFilters,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OccurrenceCategory, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateOccurrenceDto } from './dto/create-occurrence.dto';
import { OccurrenceUploadExceptionFilter } from './occurrence-upload-exception.filter';
import {
  getOccurrenceMulterOptions,
  occurrenceUploadConfig,
  type UploadedOccurrenceImage,
} from './occurrence-upload';
import { UpdateOccurrenceStatusDto } from './dto/update-occurrence-status.dto';
import { OccurrencesService } from './occurrences.service';

/**
 * Expos endpoints publicos, privados e de gestao para ocorrencias municipais.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O controlador deve separar claramente respostas publicas de respostas autenticadas.
 */
@ApiTags('occurrences')
@Controller('occurrences')
export class OccurrencesController {
  /**
   * Recebe o servico principal de ocorrencias.
   * @param occurrencesService Servico de ocorrencias.
   */
  constructor(private readonly occurrencesService: OccurrencesService) {}

  /**
   * Extrai o identificador do utilizador autenticado do pedido HTTP.
   * @param req Pedido HTTP atual.
   * @return number Identificador numerico do utilizador autenticado.
   * Pre-condicao: O pedido deve ter passado pelo guard JWT.
   * Pos-condicao: E lancada excecao 400 quando o utilizador nao e valido.
   */
  private getUserId(req: Request): number {
    const user = req.user as
      | { sub?: number; userId?: number; id?: number }
      | undefined;
    const id = user?.sub ?? user?.userId ?? user?.id;
    const parsedId = Number(id);

    if (!parsedId || Number.isNaN(parsedId)) {
      throw new BadRequestException('Utilizador autenticado invalido');
    }

    return parsedId;
  }

  /**
   * Lista as ocorrencias publicas visiveis para qualquer utilizador.
   * @return Lista publica de ocorrencias.
   */
  @Get()
  @ApiOperation({ summary: 'Listar ocorrencias publicas' })
  @ApiResponse({ status: 200, description: 'Lista publica de ocorrencias' })
  findAll() {
    return this.occurrencesService.findAll();
  }

  /**
   * Devolve o estado de disponibilidade do modulo de ocorrencias.
   * @return {{ status: string }} Estado simples do modulo.
   */
  @Get('health')
  @ApiOperation({ summary: 'Health check do modulo de ocorrencias' })
  @ApiResponse({ status: 200, description: 'OK' })
  health() {
    return { status: 'ok' };
  }

  /**
   * Lista as ocorrencias do utilizador autenticado com role CIVIL.
   * @param req Pedido HTTP autenticado.
   * @return Lista das ocorrencias do utilizador.
   */
  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CIVIL)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar ocorrencias do utilizador autenticado (CIVIL)',
  })
  @ApiResponse({ status: 200, description: 'Lista devolvida' })
  @ApiResponse({ status: 401, description: 'Sem autenticacao' })
  @ApiResponse({ status: 403, description: 'Sem permissoes (nao e CIVIL)' })
  findMine(@Req() req: Request) {
    const userId = this.getUserId(req);
    return this.occurrencesService.findMine(userId);
  }

  /**
   * Mantem compatibilidade com o alias legado de listagem das ocorrencias do utilizador.
   * @param req Pedido HTTP autenticado.
   * @return Lista das ocorrencias do utilizador.
   */
  @Get('mine/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CIVIL)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Alias legado para listar ocorrencias do utilizador autenticado',
  })
  findMineLegacy(@Req() req: Request) {
    const userId = this.getUserId(req);
    return this.occurrencesService.findMine(userId);
  }

  /**
   * Devolve o detalhe de uma ocorrencia pertencente ao utilizador autenticado.
   * @param req Pedido HTTP autenticado.
   * @param id Identificador da ocorrencia.
   * @return Detalhe da ocorrencia do utilizador.
   */
  @Get('mine/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CIVIL)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Detalhe de uma ocorrencia do utilizador autenticado (CIVIL)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da ocorrencia' })
  @ApiResponse({ status: 200, description: 'Ocorrencia encontrada' })
  @ApiResponse({
    status: 403,
    description: 'A ocorrencia nao pertence ao utilizador autenticado',
  })
  findMineById(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const userId = this.getUserId(req);
    return this.occurrencesService.findMineById(id, userId);
  }

  /**
   * Lista ocorrencias com dados adicionais para operadores e administradores.
   * @return Lista de ocorrencias para gestao interna.
   */
  @Get('management')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OPERADOR, Role.ADMINISTRADOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar ocorrencias com dados do autor para operadores',
  })
  findAllForOperator() {
    return this.occurrencesService.findAllForOperator();
  }

  /**
   * Devolve o detalhe de uma ocorrencia para operacao interna.
   * @param id Identificador da ocorrencia.
   * @return Detalhe da ocorrencia para operadores.
   */
  @Get('management/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OPERADOR, Role.ADMINISTRADOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter detalhe de uma ocorrencia para operadores' })
  @ApiParam({ name: 'id', type: Number, description: 'ID da ocorrencia' })
  findOneForOperator(@Param('id', ParseIntPipe) id: number) {
    return this.occurrencesService.findOneForOperator(id);
  }

  /**
   * Devolve o detalhe publico de uma ocorrencia.
   * @param id Identificador da ocorrencia.
   * @return Dados publicos da ocorrencia.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Detalhe publico de uma ocorrencia' })
  @ApiParam({ name: 'id', type: Number, description: 'ID da ocorrencia' })
  @ApiResponse({ status: 200, description: 'Ocorrencia encontrada' })
  @ApiResponse({ status: 404, description: 'Ocorrencia nao existe' })
  findOnePublic(@Param('id', ParseIntPipe) id: number) {
    return this.occurrencesService.findOnePublic(id);
  }

  /**
   * Faz upload de fotografias avulsas para posterior anexo a uma ocorrencia.
   * @param req Pedido HTTP autenticado.
   * @param files Ficheiros de imagem recebidos em multipart.
   * @return Lista de URLs publicas das imagens guardadas.
   */
  @Post('images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CIVIL)
  @UseFilters(OccurrenceUploadExceptionFilter)
  @UseInterceptors(
    FilesInterceptor(
      'imageUrls',
      occurrenceUploadConfig.maxFiles,
      getOccurrenceMulterOptions(),
    ),
  )
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fazer upload de imagens para anexar a uma ocorrencia',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['imageUrls'],
      properties: {
        imageUrls: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          maxItems: occurrenceUploadConfig.maxFiles,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Imagens carregadas com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Pedido invalido ou upload rejeitado',
  })
  @ApiResponse({ status: 401, description: 'Sem autenticacao' })
  @ApiResponse({ status: 403, description: 'Sem permissoes (nao e CIVIL)' })
  uploadImages(
    @Req() req: Request,
    @UploadedFiles() files: UploadedOccurrenceImage[] = [],
  ) {
    const userId = this.getUserId(req);
    return this.occurrencesService.uploadImages(userId, files);
  }

  /**
   * Cria uma nova ocorrencia associada ao utilizador autenticado.
   * @param req Pedido HTTP autenticado.
   * @param dto Dados da nova ocorrencia.
   * @return Ocorrencia criada.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CIVIL)
  @UseFilters(OccurrenceUploadExceptionFilter)
  @UseInterceptors(
    FilesInterceptor(
      'imageUrls',
      occurrenceUploadConfig.maxFiles,
      getOccurrenceMulterOptions(),
    ),
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar ocorrencia (apenas CIVIL autenticado)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['category', 'location'],
      properties: {
        category: {
          type: 'string',
          enum: Object.values(OccurrenceCategory),
        },
        otherCategoryDetail: {
          type: 'string',
          minLength: 3,
          nullable: true,
        },
        description: {
          type: 'string',
          minLength: 3,
          nullable: true,
        },
        location: {
          type: 'string',
          minLength: 2,
        },
        imageUrls: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          maxItems: occurrenceUploadConfig.maxFiles,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Ocorrencia criada' })
  @ApiResponse({
    status: 400,
    description: 'Pedido invalido ou upload rejeitado',
  })
  @ApiResponse({ status: 401, description: 'Sem autenticacao' })
  @ApiResponse({ status: 403, description: 'Sem permissoes (nao e CIVIL)' })
  create(
    @Req() req: Request,
    @Body() dto: CreateOccurrenceDto,
    @UploadedFiles() files: UploadedOccurrenceImage[] = [],
  ) {
    const userId = this.getUserId(req);
    return this.occurrencesService.create(userId, dto, files);
  }

  /**
   * Atualiza o estado de uma ocorrencia em contexto de operacao interna.
   * @param id Identificador da ocorrencia.
   * @param dto Novo estado pretendido.
   * @return Ocorrencia atualizada.
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OPERADOR, Role.ADMINISTRADOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualizar estado de uma ocorrencia (OPERADOR ou ADMINISTRADOR)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da ocorrencia' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOccurrenceStatusDto,
  ) {
    return this.occurrencesService.updateStatus(id, dto.status);
  }

  /**
   * Remove uma ocorrencia em contexto de gestao interna.
   * @param id Identificador da ocorrencia.
   * @return Ocorrencia removida.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OPERADOR, Role.ADMINISTRADOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover ocorrencia (OPERADOR ou ADMINISTRADOR)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID da ocorrencia' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.occurrencesService.remove(id);
  }
}
