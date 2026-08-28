import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { WarehouseInventoryService } from './warehouse-inventory.service';
import { CreateWarehouseInventoryDto } from './dto/create-warehouse-inventory.dto';
import { UpdateWarehouseInventoryDto } from './dto/update-warehouse-inventory.dto';
import { QueryWarehouseInventoryDto } from './dto/query-warehouse-inventory.dto';
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from '../users/entities/user.entity';

@Controller('warehouse-inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarehouseInventoryController {
  constructor(private readonly service: WarehouseInventoryService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Req() req: Request, @Body() dto: CreateWarehouseInventoryDto) {
    const user = req.user as any;
    return this.service.create(user.companyId, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findAll(@Req() req: Request, @Query() query: QueryWarehouseInventoryDto) {
    const user = req.user as any;
    return this.service.findAll(user, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    const scopedWh = user.role === UserRole.STAFF ? user.warehouseId : undefined;
    return this.service.findOne(user.companyId, id, scopedWh);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateWarehouseInventoryDto) {
    const user = req.user as any;
    return this.service.update(user.companyId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.service.remove(user.companyId, id);
  }
}