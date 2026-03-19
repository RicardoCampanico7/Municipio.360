import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';
import { occurrenceUploadConfig } from './occurrence-upload';

@Catch(MulterError, BadRequestException, PayloadTooLargeException)
export class OccurrenceUploadExceptionFilter
  implements ExceptionFilter<MulterError | BadRequestException | PayloadTooLargeException>
{
  catch(
    exception: MulterError | BadRequestException | PayloadTooLargeException,
    host: ArgumentsHost,
  ) {
    const response = host.switchToHttp().getResponse<Response>();
    const message = Array.isArray(exception.getResponse?.()['message'])
      ? exception.getResponse()['message'].join(', ')
      : (exception.getResponse?.()['message'] ?? exception.message);

    if (message === 'File too large') {
      const maxSizeMb = Math.floor(
        occurrenceUploadConfig.maxFileSizeBytes / (1024 * 1024),
      );

      response.status(400).json({
        statusCode: 400,
        message: `Cada fotografia pode ter no maximo ${maxSizeMb} MB`,
        error: BadRequestException.name,
      });
      return;
    }

    if (
      message === 'Too many files' ||
      exception instanceof MulterError &&
        (exception.code === 'LIMIT_FILE_COUNT' || exception.code === 'LIMIT_UNEXPECTED_FILE')
    ) {
      response.status(400).json({
        statusCode: 400,
        message: `Pode enviar no maximo ${occurrenceUploadConfig.maxFiles} fotografias`,
        error: BadRequestException.name,
      });
      return;
    }

    if (exception instanceof BadRequestException || exception instanceof PayloadTooLargeException) {
      response.status(exception instanceof PayloadTooLargeException ? 400 : exception.getStatus()).json({
        statusCode: exception instanceof PayloadTooLargeException ? 400 : exception.getStatus(),
        message,
        error: BadRequestException.name,
      });
      return;
    }

    response.status(400).json({
      statusCode: 400,
      message: 'Falha no upload das fotografias',
      error: BadRequestException.name,
    });
  }
}
