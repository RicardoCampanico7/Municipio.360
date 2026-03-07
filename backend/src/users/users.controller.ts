import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

// IMPORTS DO SWAGGER
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Users')        // aparece como "Users" no Swagger
@ApiBearerAuth()         // diz ao Swagger que este controller usa JWT
@Controller("users")
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OPERADOR)
  @Get()
  findAll() {
    return this.prisma.user.findMany();
  }
}