import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { UserRole } from '../users/entities/user.entity';
import { TransactionType, TransactionReason } from './entities/transaction.entity';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: jest.Mocked<TransactionsService>;

  const mockAdminReq = {
    user: { userId: 'u-1', role: UserRole.ADMIN, companyId: 'comp-1' },
  } as any;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [{ provide: TransactionsService, useValue: mockService }],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    service = module.get(TransactionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates creation to service with full req.user context', async () => {
      const dto = {
        warehouseInventoryId: 'inv-1',
        quantity: 10,
        type: TransactionType.STOCK_IN,
        reason: TransactionReason.PURCHASE,
      };
      service.create.mockResolvedValue({ id: 'tx-1', ...dto } as any);

      await controller.create(mockAdminReq, dto);

      expect(service.create).toHaveBeenCalledWith(mockAdminReq.user, dto);
    });
  });
});