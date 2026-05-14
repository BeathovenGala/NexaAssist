import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserCodeService } from './user-code.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserCodeService],
  exports: [UsersService, UserCodeService],
})
export class UsersModule {}
