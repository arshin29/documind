import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { WorkspaceRole, MemberStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    workspace: {
      create: jest.fn(),
    },
    workspaceMember: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
    };

    it('should successfully register a new user, create workspace, and return token without passwordHash', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const createdUser = {
        id: 'user-uuid-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: '$2b$10$hashedPasswordHere',
        avatarColor: '#7185E8',
        avatarInitials: 'JD',
        bio: null,
        timezone: 'UTC',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdWorkspace = {
        id: 'workspace-uuid-1',
        name: "Jane Doe's Workspace",
        description: 'Default workspace for Jane Doe',
        plan: 'Pro',
        storageLimitBytes: BigInt(2147483648),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue(createdUser) },
          workspace: { create: jest.fn().mockResolvedValue(createdWorkspace) },
          workspaceMember: {
            create: jest.fn().mockResolvedValue({
              id: 'member-uuid-1',
              workspaceId: createdWorkspace.id,
              userId: createdUser.id,
              role: WorkspaceRole.OWNER,
              status: MemberStatus.ACTIVE,
            }),
          },
        };
        return callback(tx);
      });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken', 'mock.jwt.token');
      expect(result.user.id).toBe(createdUser.id);
      expect(result.user.email).toBe(createdUser.email);
      expect((result.user as any).passwordHash).toBeUndefined();
      expect((result.user as any).password).toBeUndefined();

      expect(result.workspace.id).toBe(createdWorkspace.id);
      expect(result.workspace.name).toBe("Jane Doe's Workspace");
      expect(result.workspace.role).toBe(WorkspaceRole.OWNER);
      expect(result.workspace.storageLimitBytes).toBe(2147483648);
    });

    it('should reject duplicate email registration with ConflictException (409)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: 'jane@example.com',
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'jane@example.com',
      password: 'password123',
    };

    it('should successfully log in with valid credentials and return JWT without passwordHash', async () => {
      const passwordHash = await bcrypt.hash(loginDto.password, 10);
      const user = {
        id: 'user-uuid-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash,
        avatarColor: '#7185E8',
        avatarInitials: 'JD',
        bio: null,
        timezone: 'UTC',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken', 'mock.jwt.token');
      expect(result.user.id).toBe(user.id);
      expect(result.user.email).toBe(user.email);
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should reject unknown email with UnauthorizedException without leaking existence', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject incorrect password with UnauthorizedException', async () => {
      const realPasswordHash = await bcrypt.hash('different-password', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'jane@example.com',
        passwordHash: realPasswordHash,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile and workspace memberships without passwordHash', async () => {
      const userWithMemberships = {
        id: 'user-uuid-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: '$2b$10$hashedPasswordHere',
        avatarColor: '#7185E8',
        avatarInitials: 'JD',
        bio: 'Hello world',
        timezone: 'UTC',
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [
          {
            id: 'member-1',
            role: WorkspaceRole.OWNER,
            status: MemberStatus.ACTIVE,
            joinedAt: new Date(),
            workspace: {
              id: 'ws-1',
              name: "Jane Doe's Workspace",
              description: 'My workspace',
              plan: 'Pro',
              storageLimitBytes: BigInt(2147483648),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithMemberships);

      const result = await service.getProfile('user-uuid-1');

      expect(result.user.id).toBe('user-uuid-1');
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.memberships).toHaveLength(1);
      expect(result.memberships[0].role).toBe(WorkspaceRole.OWNER);
      expect(result.memberships[0].status).toBe(MemberStatus.ACTIVE);
      expect(result.memberships[0].workspace.storageLimitBytes).toBe(2147483648);
    });
  });
});

