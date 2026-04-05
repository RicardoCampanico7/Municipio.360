import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({
    example: 401,
    description: 'Codigo HTTP devolvido pela API',
  })
  statusCode: number;

  @ApiProperty({
    example: 'Credenciais invalidas',
    description: 'Mensagem de erro principal',
  })
  message: string | string[];

  @ApiProperty({
    example: 'Unauthorized',
    description: 'Nome curto da excecao HTTP',
  })
  error: string;
}

export class ValidationErrorResponseDto {
  @ApiProperty({
    example: 400,
    description: 'Codigo HTTP devolvido pela API',
  })
  statusCode: number;

  @ApiPropertyOptional({
    type: [String],
    example: [
      'email must be an email',
      'password must be longer than or equal to 6 characters',
    ],
    description: 'Lista de erros de validacao do pedido',
  })
  message: string[];

  @ApiProperty({
    example: 'Bad Request',
    description: 'Nome curto da excecao HTTP',
  })
  error: string;
}
