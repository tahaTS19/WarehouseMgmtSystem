import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { QueryReportDto } from './dto/query-report.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('low-stock')
  getLowStock(@Req() req: any, @Query() query: QueryReportDto) {
    return this.reportsService.getLowStockReport(req.user, query);
  }

  @Get('inventory-value')
  getValuation(@Req() req: any, @Query('warehouseId') warehouseId?: string) {
    return this.reportsService.getInventoryValuationReport(req.user, warehouseId);
  }

  @Get('product-movement')
  getMovement(@Req() req: any, @Query() query: QueryReportDto) {
    return this.reportsService.getProductMovementReport(req.user, query);
  }

  @Get('recent-transactions')
  getRecentTransactions(@Req() req: any, @Query() query: QueryReportDto) {
    return this.reportsService.getRecentTransactionsReport(req.user, query);
  }
}