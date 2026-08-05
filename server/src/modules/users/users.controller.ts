import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateStaffDto } from './dto/create-user.dto';
import { UpdateStaffDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  createStaff(@Req() req: Request, @Body() createStaffDto: CreateStaffDto) {
    const user = req.user as any;
    return this.usersService.createStaff(user.companyId, createStaffDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Req() req: Request,
    @Query() query: QueryUsersDto,
  ) {
    const user = req.user as any;

    return this.usersService.findAllByCompany(
      user.companyId,
      query.search,
      query.warehouseId,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.usersService.findOne(user.companyId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  updateStaff(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateStaffDto: UpdateStaffDto,
  ) {
    const user = req.user as any;
    return this.usersService.updateStaff(user.companyId, id, updateStaffDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  removeStaff(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.usersService.removeStaff(user.companyId, id);
  }
}