import { Controller, Get, Post } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("users")
export class UsersController {
  constructor(private prisma: PrismaService) {}

  //@Post()
  /*create() {
    return this.prisma.user.create({
      data: {
        email: `test${Date.now()}@mail.com`,
      },
    });
  }
*/
  @Get()
  findAll() {
    return this.prisma.user.findMany();
  }
}
