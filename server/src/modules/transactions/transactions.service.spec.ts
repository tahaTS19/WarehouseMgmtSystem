import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionType, TransactionReason } from './entities/transaction.entity';
import { UserRole } from '../users/entities/user.entity';

describe('TransactionsService', () => {
  let service: TransactionsService;

  const mockAdminUser = {
    userId: 'u-admin-1',
    companyId: 'comp-1',
    role: UserRole.ADMIN,
  };

  const mockQueryRunner: any = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const mockRepo = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(Transaction), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('throws NotFoundException if target inventory item is not found or out of scope', async () => {
      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(mockQb);

      await expect(
        service.create(mockAdminUser, {
          warehouseInventoryId: 'inv-99',
          quantity: 10,
          type: TransactionType.STOCK_IN,
          reason: TransactionReason.PURCHASE,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('throws BadRequestException if stock_out exceeds currentStock', async () => {
      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'inv-1',
          currentStock: 5,
          warehouse: { companyId: 'comp-1' },
        }),
      };
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(mockQb);

      await expect(
        service.create(mockAdminUser, {
          warehouseInventoryId: 'inv-1',
          quantity: 10,
          type: TransactionType.STOCK_OUT,
          reason: TransactionReason.SALE,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});