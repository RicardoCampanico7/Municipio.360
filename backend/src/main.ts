import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import { AppModule } from './app.module';
import {
  ensureOccurrenceUploadsDirectory,
  occurrenceUploadConfig,
} from './occurences/occurrence-upload';

/**
 * Arranca a aplicacao Nest, configura CORS, validacao global e documentacao Swagger.
 * @param none Metodo de arranque sem parametros externos.
 * @return Promise<void> Promessa resolvida apos a API ficar em escuta.
 * Pre-condicao: As variaveis de ambiente necessarias devem estar carregadas.
 * Pos-condicao: A aplicacao fica disponivel na porta configurada.
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  await ensureOccurrenceUploadsDirectory();

  app.use(
    occurrenceUploadConfig.publicBasePath,
    express.static(occurrenceUploadConfig.uploadsRoot),
  );

  app.enableCors({
    origin: ['http://localhost:5173'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Municipio360 API')
    .setDescription(
      'API Reference do Sistema de Gestao Municipal com suporte a autenticacao JWT e testes interativos dos endpoints.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Introduz o token JWT obtido no endpoint /auth/login',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Municipio360 API Reference',
    jsonDocumentUrl: 'api/openapi.json',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      displayRequestDuration: true,
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  app.getHttpAdapter().get('/docs', (_req, res) => {
    res.redirect('/api');
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  const appUrl = await app.getUrl();
  logger.log(`Backend disponivel em ${appUrl}`);
  logger.log(`API Reference (Swagger UI): ${appUrl}/api`);
  logger.log(`OpenAPI JSON: ${appUrl}/api/openapi.json`);
  logger.log(`Alias rapido da documentacao: ${appUrl}/docs`);
  logger.log(
    'Usa o endpoint /auth/login para obter um JWT e depois clica em "Authorize" na API Reference.',
  );
}

void bootstrap();
