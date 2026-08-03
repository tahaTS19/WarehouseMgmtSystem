import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';

// No @Roles() restriction here — both Admin and Staff can hit this endpoint,
// they just each get a different summary shape scoped to their own data.
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(@Req() request: Request) {
    const user = request.user as any;

    if (user.role === UserRole.ADMIN) {
      return this.dashboardService.getAdminSummary(user.companyId);
    }

    return this.dashboardService.getStaffSummary(user.warehouseId);
  }
}
