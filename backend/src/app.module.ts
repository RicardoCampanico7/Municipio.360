import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { OccurrencesModule } from './occurences/occurrences.module';


@Module({
  imports: [PrismaModule, UsersModule, AuthModule, OccurrencesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
