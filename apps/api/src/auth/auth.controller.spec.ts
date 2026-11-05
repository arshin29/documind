import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceRole, MemberStatus } from '@prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockSafeUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    name: 'Test User',
    avatarColor: '#7185E8',
    avatarInitials: 'TU',
    bio: null,
    timezone: 'UTC',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWorkspace = {
    id: 'workspace-uuid-1',
    name: "Test User's Workspace",
    description: 'Default workspace for Test User',
    plan: 'Pro',
    storageLimitBytes: 2147483648,
    role: WorkspaceRole.OWNER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthService = {
    register: jest.fn().mockResolvedValue({
      accessToken: 'jwt-access-token',
      user: mockSafeUser,
      workspace: mockWorkspace,
    }),
    login: jest.fn().mockResolvedValue({
      accessToken: 'jwt-access-token',
      user: mockSafeUser,
    }),
    getProfile: jest.fn().mockResolvedValue({
      user: mockSafeUser,
      memberships: [
        {
          id: 'member-1',
          role: WorkspaceRole.OWNER,
          status: MemberStatus.ACTIVE,
          joinedAt: new Date(),
          workspace: mockWorkspace,
        },
      ],
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register with DTO and return response', async () => {
      const dto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };
      const result = await controller.register(dto);
      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('accessToken');
      expect(result.workspace.role).toBe(WorkspaceRole.OWNER);
    });
  });

  describe('login', () => {
    it('should call authService.login with DTO and return response', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const result = await controller.login(dto);
      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('getMe', () => {
    it('should call authService.getProfile with user id and return profile', async () => {
      const result = await controller.getMe(mockSafeUser);
      expect(authService.getProfile).toHaveBeenCalledWith(mockSafeUser.id);
      expect(result.user.id).toBe(mockSafeUser.id);
      expect(result.memberships).toHaveLength(1);
    });
  });
});

