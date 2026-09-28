import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ProfileService } from './profile.service';
import { User } from '../users/entities/user.entity';

// Mock the entire bcrypt library at the top level
jest.mock('bcrypt');

describe('ProfileService', () => {
  let service: ProfileService;

  const mockUserRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('returns user profile excluding password field', async () => {
      const mockUser = {
        id: 'u-1',
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'John Doe',
      };
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.getProfile('u-1');

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('test@example.com');
    });

    it('throws NotFoundException if user does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfile('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('changePassword', () => {
    it('throws UnauthorizedException if current password does not match', async () => {
      const mockUser = { id: 'u-1', password: '$2b$10$hashed' };
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      // Mock bcrypt.compare to return false
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('u-1', {
          currentPassword: 'wrong',
          newPassword: 'newPassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('updates password successfully when current password matches', async () => {
      const mockUser = { id: 'u-1', password: '$2b$10$hashed' };
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      // Mock bcrypt functions
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('randomsalt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhashedpassword');

      mockUserRepo.save.mockImplementation((u) => Promise.resolve(u));

      const result = await service.changePassword('u-1', {
        currentPassword: 'correctPassword',
        newPassword: 'newPassword123',
      });

      expect(result).toEqual({ message: 'Password changed successfully' });
      expect(mockUserRepo.save).toHaveBeenCalled();
    });
  });
});