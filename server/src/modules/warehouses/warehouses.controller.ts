import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { Request } from 'express';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { QueryWarehousesDto } from './dto/query-warehouses.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('warehouses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Req() req: Request, @Body() createWarehouseDto: CreateWarehouseDto) {
    const user = req.user as any;
    return this.warehousesService.create(user.companyId, createWarehouseDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Req() req: Request,
    @Query() query: QueryWarehousesDto,
  ) {
    const user = req.user as any;
    return this.warehousesService.findAllByCompany(
      user.companyId,
      query.search,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.warehousesService.findOne(user.companyId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateWarehouseDto: UpdateWarehouseDto,
  ) {
    const user = req.user as any;
    return this.warehousesService.update(user.companyId, id, updateWarehouseDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.warehousesService.remove(user.companyId, id);
  }
}