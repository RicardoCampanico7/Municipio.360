import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
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
    .setDescription('Documentacao da API do Sistema de Gestao Municipal')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
