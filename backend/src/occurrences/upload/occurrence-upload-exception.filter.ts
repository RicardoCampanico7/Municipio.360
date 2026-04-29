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
import { OCCURRENCE_ERROR_MESSAGES } from '../constants/occurrence.constants';

const BAD_REQUEST_ERROR = 'Bad Request';

function getExceptionMessage(
  exception: MulterError | BadRequestException | PayloadTooLargeException,
) {
  const exceptionResponse =
    'getResponse' in exception && typeof exception.getResponse === 'function'
      ? exception.getResponse()
      : undefined;
  const rawMessage =
    exceptionResponse &&
    typeof exceptionResponse === 'object' &&
    'message' in exceptionResponse
      ? exceptionResponse.message
      : exception.message;

  if (Array.isArray(rawMessage)) {
    return rawMessage.join(', ');
  }

  return typeof rawMessage === 'string' ? rawMessage : exception.message;
}

@Catch(MulterError, BadRequestException, PayloadTooLargeException)
export class OccurrenceUploadExceptionFilter implements ExceptionFilter<
  MulterError | BadRequestException | PayloadTooLargeException
> {
  catch(
    exception: MulterError | BadRequestException | PayloadTooLargeException,
    host: ArgumentsHost,
  ) {
    const response = host.switchToHttp().getResponse<Response>();
    const message = getExceptionMessage(exception);

    if (message === 'File too large') {
      const maxSizeMb = Math.floor(
        occurrenceUploadConfig.maxFileSizeBytes / (1024 * 1024),
      );

      response.status(400).json({
        statusCode: 400,
        message: `Cada fotografia pode ter no maximo ${maxSizeMb} MB`,
        error: BAD_REQUEST_ERROR,
      });
      return;
    }

    if (
      message === 'Too many files' ||
      (exception instanceof MulterError &&
        (exception.code === 'LIMIT_FILE_COUNT' ||
          exception.code === 'LIMIT_UNEXPECTED_FILE'))
    ) {
      response.status(400).json({
        statusCode: 400,
        message: OCCURRENCE_ERROR_MESSAGES.maxImages(
          occurrenceUploadConfig.maxFiles,
        ),
        error: BAD_REQUEST_ERROR,
      });
      return;
    }

    if (
      exception instanceof BadRequestException ||
      exception instanceof PayloadTooLargeException
    ) {
      response
        .status(
          exception instanceof PayloadTooLargeException
            ? 400
            : exception.getStatus(),
        )
        .json({
          statusCode:
            exception instanceof PayloadTooLargeException
              ? 400
              : exception.getStatus(),
          message,
          error: BAD_REQUEST_ERROR,
        });
      return;
    }

    response.status(400).json({
      statusCode: 400,
      message: 'Falha no upload das fotografias',
      error: BAD_REQUEST_ERROR,
    });
  }
}
