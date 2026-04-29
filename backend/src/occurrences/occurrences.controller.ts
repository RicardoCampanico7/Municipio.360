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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { OccurrenceCategory, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { RolesGuard } from '../shared/guards/roles.guard';
import {
  ApiErrorResponseDto,
  ValidationErrorResponseDto,
} from '../shared/dto/api-error-response.dto';
import { ModuleHealthResponseDto } from '../app/dto/app-response.dto';
import {
  OccurrenceImageUploadResponseDto,
  OccurrenceInternalCommentResponseDto,
  OwnerOccurrenceDetailResponseDto,
  OperatorOccurrenceResponseDto,
  OwnerOccurrenceResponseDto,
  PublicOccurrenceResponseDto,
} from './dto/responses/occurrence-response.dto';
import { CreateOccurrenceDto } from './dto/create-occurrence.dto';
import { OccurrenceUploadExceptionFilter } from './upload/occurrence-upload-exception.filter';
import {
  OCCURRENCE_IMAGE_UPLOAD_FIELD_NAME,
  getOccurrenceMulterOptions,
  occurrenceUploadConfig,
  type UploadedOccurrenceImage,
} from './upload/occurrence-upload';
import { UpdateOccurrenceStatusDto } from './dto/update-occurrence-status.dto';
import { CreateOccurrenceInternalCommentDto } from './dto/create-occurrence-internal-comment.dto';
import { UpdateOccurrenceDto } from './dto/update-occurrence.dto';
import { OccurrencesService } from './occurrences.service';
import { OCCURRENCE_ERROR_MESSAGES } from './constants/occurrence.constants';

const occurrenceMultipartImagesSchema: SchemaObject = {
  type: 'array',
  items: {
    type: 'string',
    format: 'binary',
  },
  maxItems: occurrenceUploadConfig.maxFiles,
};

const uploadOccurrenceImagesRequestSchema: SchemaObject = {
  type: 'object',
  required: [OCCURRENCE_IMAGE_UPLOAD_FIELD_NAME],
  properties: {
    [OCCURRENCE_IMAGE_UPLOAD_FIELD_NAME]: occurrenceMultipartImagesSchema,
  },
};

const createOccurrenceRequestSchema: SchemaObject = {
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
    uploadedImageUrls: {
      type: 'array',
      items: {
        type: 'string',
      },
      description:
        'URLs publicas previamente carregadas em POST /occurrences/images',
      maxItems: occurrenceUploadConfig.maxFiles,
    },
    imageUrls: occurrenceMultipartImagesSchema,
  },
};

/**
 * Expos endpoints publicos, privados e de gestao para ocorrencias municipais.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 05/04/2026
 * @inv O controlador deve separar claramente respostas publicas de respostas autenticadas.
 * @inv O detalhe privado do cidadao deve permanecer acessivel apenas ao respetivo proprietario.
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
      throw new BadRequestException(
        OCCURRENCE_ERROR_MESSAGES.invalidAuthenticatedUser,
      );
    }

    return parsedId;
  }

  /**
   * Lista as ocorrencias publicas visiveis para qualquer utilizador.
   * @return Lista publica de ocorrencias.
   */
  @Get()
  @ApiOperation({ summary: 'Listar ocorrencias publicas' })
  @ApiOkResponse({
    description: 'Lista publica de ocorrencias',
    type: PublicOccurrenceResponseDto,
    isArray: true,
  })
  findAll() {
    return this.occurrencesService.findAll();
  }

  /**
   * Devolve o estado de disponibilidade do modulo de ocorrencias.
   * @return {{ status: string }} Estado simples do modulo.
   */
  @Get('health')
  @ApiOperation({ summary: 'Health check do modulo de ocorrencias' })
  @ApiOkResponse({
    description: 'Modulo operacional',
    type: ModuleHealthResponseDto,
  })
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
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Listar ocorrencias do utilizador autenticado (CIVIL)',
  })
  @ApiOkResponse({
    description: 'Lista devolvida',
    type: OwnerOccurrenceResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Sem autenticacao',
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Sem permissoes (nao e CIVIL)',
    type: ApiErrorResponseDto,
  })
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
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Alias legado para listar ocorrencias do utilizador autenticado',
  })
  @ApiOkResponse({
    description: 'Lista devolvida',
    type: OwnerOccurrenceResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Sem autenticacao',
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Sem permissoes (nao e CIVIL)',
    type: ApiErrorResponseDto,
  })
  findMineLegacy(@Req() req: Request) {
    const userId = this.getUserId(req);
    return this.occurrencesService.findMine(userId);
  }

  /**
   * Devolve o detalhe de uma ocorrencia pertencente ao utilizador autenticado.
   * @param req Pedido HTTP autenticado.
   * @param id Identificador da ocorrencia.
   * @return Detalhe da ocorrencia do utilizador com historico de estados.
   * Pre-condicao: O pedido deve estar autenticado com a role CIVIL.
   * Pos-condicao: Apenas o proprietario recebe o detalhe com o historico cronologico da ocorrencia.
   */
  @Get('mine/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CIVIL)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Detalhe de uma ocorrencia do utilizador autenticado (CIVIL)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da ocorrencia' })
  @ApiOkResponse({
    description: 'Ocorrencia encontrada',
    type: OwnerOccurrenceDetailResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Sem autenticacao',
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'A ocorrencia nao pertence ao utilizador autenticado',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Ocorrencia nao existe',
    type: ApiErrorResponseDto,
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
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Listar ocorrencias com dados do autor para operadores',
  })
  @ApiOkResponse({
    description: 'Lista de ocorrencias para gestao interna',
    type: OperatorOccurrenceResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Sem autenticacao',
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Sem permissoes para consultar a area de gestao',
    type: ApiErrorResponseDto,
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
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Obter detalhe de uma ocorrencia para operadores' })
  @ApiParam({ name: 'id', type: Number, description: 'ID da ocorrencia' })
  @ApiOkResponse({
    description: 'Ocorrencia encontrada',
    type: OperatorOccurrenceResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Sem autenticacao',
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Sem permissoes para consultar a area de gestao',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Ocorrencia nao existe',
    type: ApiErrorResponseDto,
  })
  findOneForOperator(@Param('id', ParseIntPipe) id: number) {
    return this.occurrencesService.findOneForOperator(id);
  }

  /**
   * Lista os comentarios internos de uma ocorrencia para utilizacao operacional.
   * @param id Identificador da ocorrencia.
   * @return Lista cronologica de comentarios internos.
   */
  @Get('management/:id/internal-comments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OPERADOR, Role.ADMINISTRADOR)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Listar comentarios internos de uma ocorrencia para operadores',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da ocorrencia' })
  @ApiOkResponse({
    description: 'Comentarios internos devolvidos',
    type: OccurrenceInternalCommentResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Sem autenticacao',
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Sem permissoes para consultar comentarios internos',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Ocorrencia nao existe',
    type: ApiErrorResponseDto,
  })
  listInternalComments(@Param('id', ParseIntPipe) id: number) {
    return this.occurrencesService.listInternalComments(id);
  }

  /**
   * Cria um comentario interno associado a uma ocorrencia.
   * @param req Pedido HTTP autenticado.
   * @param id Identificador da ocorrencia.
   * @param dto Conteudo do comentario interno.
   * @return Comentario interno criado.
   */
  @Post('management/:id/internal-comments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OPERADOR, Role.ADMINISTRADOR)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Criar comentario interno numa ocorrencia para operadores',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da ocorrencia' })
  @ApiBody({ type: CreateOccurrenceInternalCommentDto })
  @ApiCreatedResponse({
    description: 'Comentario interno criado',
    type: OccurrenceInternalCommentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Pedido invalido',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Sem autenticacao',
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Sem permissoes para comentar internamente',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Ocorrencia nao existe',
    type: ApiErrorResponseDto,
  })
  createInternalComment(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateOccurrenceInternalCommentDto,
  ) {
    const userId = this.getUserId(req);
    return this.occurrencesService.createInternalComment(id, userId, dto);
  }

  /**
   * Devolve o detalhe publico de uma ocorrencia.
   * @param id Identificador da ocorrencia.
   * @return Dados publicos da ocorrencia.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Detalhe publico de uma ocorrencia' })
  @ApiParam({ name: 'id', type: Number, description: 'ID da ocorrencia' })
  @ApiOkResponse({
    description: 'Ocorrencia encontrada',
    type: PublicOccurrenceResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Ocorrencia nao existe',
    type: ApiErrorResponseDto,
  })
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
      OCCURRENCE_IMAGE_UPLOAD_FIELD_NAME,
      occurrenceUploadConfig.maxFiles,
      getOccurrenceMulterOptions(),
    ),
  )
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Fazer upload de imagens para anexar a uma ocorrencia',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: uploadOccurrenceImagesRequestSchema,
  })
  @ApiCreatedResponse({
    description: 'Imagens carregadas com sucesso',
    type: OccurrenceImageUploadResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Pedido invalido ou upload rejeitado',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Sem autenticacao',
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Sem permissoes (nao e CIVIL)',
    type: ApiErrorResponseDto,
  })
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
      OCCURRENCE_IMAGE_UPLOAD_FIELD_NAME,
      occurrenceUploadConfig.maxFiles,
      getOccurrenceMulterOptions(),
    ),
  )
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary:
      'Criar ocorrencia com ficheiros multipart ou URLs previamente carregadas',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: createOccurrenceRequestSchema,
  })
  @ApiCreatedResponse({
    description: 'Ocorrencia criada',
    type: OwnerOccurrenceResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Pedido invalido ou upload rejeitado',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Sem autenticacao',
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Sem permissoes (nao e CIVIL)',
    type: ApiErrorResponseDto,
  })
  create(
    @Req() req: Request,
    @Body() dto: CreateOccurrenceDto,
    @UploadedFiles() files: UploadedOccurrenceImage[] = [],
  ) {
    const userId = this.getUserId(req);
    return this.occurrencesService.create(userId, dto, files);
  }

  /**
   * Atualiza os campos editaveis de uma ocorrencia em contexto de operacao interna.
   * @param id Identificador da ocorrencia.
   * @param dto Dados editaveis da ocorrencia.
   * @return Ocorrencia atualizada.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OPERADOR, Role.ADMINISTRADOR)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary:
      'Atualizar dados de uma ocorrencia (OPERADOR ou ADMINISTRADOR)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da ocorrencia' })
  @ApiBody({ type: UpdateOccurrenceDto })
  @ApiOkResponse({
    description: 'Ocorrencia atualizada',
    type: OperatorOccurrenceResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Pedido invalido',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Sem autenticacao',
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Sem permissoes para atualizar a ocorrencia',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Ocorrencia nao existe',
    type: ApiErrorResponseDto,
  })
  updateOccurrence(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOccurrenceDto,
  ) {
    return this.occurrencesService.updateOccurrence(id, dto);
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
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Atualizar estado de uma ocorrencia (OPERADOR ou ADMINISTRADOR)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da ocorrencia' })
  @ApiBody({ type: UpdateOccurrenceStatusDto })
  @ApiOkResponse({
    description: 'Ocorrencia atualizada',
    type: OperatorOccurrenceResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Transicao de estado invalida ou body invalido',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Sem autenticacao',
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Sem permissoes para atualizar a ocorrencia',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Ocorrencia nao existe',
    type: ApiErrorResponseDto,
  })
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
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remover ocorrencia (OPERADOR ou ADMINISTRADOR)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID da ocorrencia' })
  @ApiOkResponse({
    description: 'Ocorrencia removida',
    type: OperatorOccurrenceResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Sem autenticacao',
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Sem permissoes para remover a ocorrencia',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Ocorrencia nao existe',
    type: ApiErrorResponseDto,
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.occurrencesService.remove(id);
  }
}
