import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UserRole } from '../users/entities/user.entity';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: jest.Mocked<ProductsService>;

  const mockCompanyId = 'comp-uuid-1111';
  const mockReq = {
    user: {
      userId: 'user-uuid-1',
      role: UserRole.ADMIN,
      companyId: mockCompanyId,
    },
  } as any;

  beforeEach(async () => {
    const mockProductsService = {
      create: jest.fn(),
      findAllByCompany: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      attachImage: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get(ProductsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('extracts companyId from req.user and delegates to service.create', async () => {
      const dto: CreateProductDto = {
        name: 'Wireless Keyboard',
        sku: 'KB-200',
        unitPrice: 49.99,
      };
      const expectedResult = { id: 'prod-1', companyId: mockCompanyId, ...dto } as any;
      service.create.mockResolvedValue(expectedResult);

      const result = await controller.create(mockReq, dto);

      expect(service.create).toHaveBeenCalledWith(mockCompanyId, dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('extracts companyId from req.user and passes query dto to service.findAllByCompany', async () => {
      const query: QueryProductDto = { page: 1, limit: 10, search: 'keyboard' };
      const expectedResponse = {
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      };
      service.findAllByCompany.mockResolvedValue(expectedResponse);

      const result = await controller.findAll(mockReq, query);

      expect(service.findAllByCompany).toHaveBeenCalledWith(mockCompanyId, query);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('findOne', () => {
    it('passes companyId and id param to service.findOne', async () => {
      const expectedProduct = { id: 'prod-1', companyId: mockCompanyId, name: 'Keyboard' } as any;
      service.findOne.mockResolvedValue(expectedProduct);

      const result = await controller.findOne(mockReq, 'prod-1');

      expect(service.findOne).toHaveBeenCalledWith(mockCompanyId, 'prod-1');
      expect(result).toEqual(expectedProduct);
    });
  });

  describe('update', () => {
    it('passes companyId, id, and dto to service.update', async () => {
      const dto: UpdateProductDto = { unitPrice: 39.99 };
      const updatedProduct = { id: 'prod-1', companyId: mockCompanyId, unitPrice: 39.99 } as any;
      service.update.mockResolvedValue(updatedProduct);

      const result = await controller.update(mockReq, 'prod-1', dto);

      expect(service.update).toHaveBeenCalledWith(mockCompanyId, 'prod-1', dto);
      expect(result).toEqual(updatedProduct);
    });
  });

  describe('uploadImage', () => {
    it('passes companyId, id, and Express.Multer.File to service.attachImage', async () => {
      const mockFile = {
        fieldname: 'image',
        originalname: 'keyboard.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: Buffer.from('fake-image-bytes'),
        size: 1024,
      } as Express.Multer.File;

      const updatedProduct = {
        id: 'prod-1',
        companyId: mockCompanyId,
        image: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      } as any;

      service.attachImage.mockResolvedValue(updatedProduct);

      const result = await controller.uploadImage(mockReq, 'prod-1', mockFile);

      expect(service.attachImage).toHaveBeenCalledWith(mockCompanyId, 'prod-1', mockFile);
      expect(result).toEqual(updatedProduct);
    });
  });

  describe('remove', () => {
    it('passes companyId and id to service.remove', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockReq, 'prod-1');

      expect(service.remove).toHaveBeenCalledWith(mockCompanyId, 'prod-1');
    });
  });
});