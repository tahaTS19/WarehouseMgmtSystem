import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

describe('ProfileController', () => {
  let controller: ProfileController;
  let service: jest.Mocked<ProfileService>;

  const mockUserReq = { user: { userId: 'u-1', role: 'staff' } } as any;

  beforeEach(async () => {
    const mockService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: ProfileService, useValue: mockService }],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
    service = module.get(ProfileService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('delegates to service with req.user.userId', async () => {
      service.getProfile.mockResolvedValue({ id: 'u-1', name: 'John Doe' } as any);

      const result = await controller.getProfile(mockUserReq);

      expect(service.getProfile).toHaveBeenCalledWith('u-1');
      expect(result).toEqual({ id: 'u-1', name: 'John Doe' });
    });
  });

  describe('updateProfile', () => {
    it('delegates profile updates to service', async () => {
      const dto = { name: 'Jane Doe', phone: '+123456789' };
      service.updateProfile.mockResolvedValue({ id: 'u-1', ...dto } as any);

      const result = await controller.updateProfile(mockUserReq, dto);

      expect(service.updateProfile).toHaveBeenCalledWith('u-1', dto);
      expect(result.name).toBe('Jane Doe');
    });
  });

  describe('changePassword', () => {
    it('delegates password changes to service', async () => {
      const dto = { currentPassword: 'old', newPassword: 'new' };
      service.changePassword.mockResolvedValue({ message: 'Password changed successfully' });

      const result = await controller.changePassword(mockUserReq, dto);

      expect(service.changePassword).toHaveBeenCalledWith('u-1', dto);
      expect(result).toEqual({ message: 'Password changed successfully' });
    });
  });
});