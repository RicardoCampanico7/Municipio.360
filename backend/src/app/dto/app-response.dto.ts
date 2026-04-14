import { ApiProperty } from '@nestjs/swagger';

export class HelloResponseDto {
  @ApiProperty({
    example: 'Hello World!',
    description: 'Mensagem simples do endpoint raiz',
  })
  message: string;
}

export class AppHealthResponseDto {
  @ApiProperty({
    example: true,
    description: 'Indica se a API esta operacional',
  })
  ok: boolean;
}

export class ModuleHealthResponseDto {
  @ApiProperty({
    example: 'ok',
    description: 'Estado simples do modulo',
  })
  status: string;
}
