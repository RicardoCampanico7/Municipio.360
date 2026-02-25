import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('occurrences')
@UseGuards(JwtAuthGuard)
export class OccurrencesController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}