import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from '../users/entities/user.entity';

@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(@Req() req: Request, @Body() dto: CreateTransactionDto) {
    const user = req.user as any;
    return this.service.create(user, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findAll(@Req() req: Request, @Query() query: QueryTransactionDto) {
    const user = req.user as any;
    return this.service.findAll(user, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.service.findOne(user, id);
  }
}