import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('occurrences')
export class OccurrencesController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CIVIL)
  createPlaceholder() {
    return { message: 'Protected endpoint working (Role.CIVIL)' };
  }
}