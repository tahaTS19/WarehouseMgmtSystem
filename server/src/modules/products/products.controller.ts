import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from '../users/entities/user.entity';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Req() req: Request, @Body() dto: CreateProductDto) {
    const user = req.user as any;
    return this.productsService.create(user.companyId, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findAll(@Req() req: Request, @Query() query: QueryProductDto) {
    const user = req.user as any;
    return this.productsService.findAllByCompany(user.companyId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.productsService.findOne(user.companyId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const user = req.user as any;
    return this.productsService.update(user.companyId, id, dto);
  }

  @Post(':id/image')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  uploadImage(
    @Req() req: Request,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const user = req.user as any;
    return this.productsService.attachImage(user.companyId, id, file);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.productsService.remove(user.companyId, id);
  }
}