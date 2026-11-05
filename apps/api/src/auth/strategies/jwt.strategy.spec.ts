import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockConfigService: Partial<ConfigService>;
  let mockPrismaService: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret-key-12345';
        return null;
      }),
    };

    mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    strategy = new JwtStrategy(
      mockConfigService as ConfigService,
      mockPrismaService as PrismaService,
    );
  });

  it('should throw an error if JWT_SECRET is missing', () => {
    const emptyConfig = {
      get: jest.fn().mockReturnValue(null),
    };

    expect(() => {
      new JwtStrategy(emptyConfig as any, mockPrismaService as any);
    }).toThrow(/JWT_SECRET environment variable is missing/);
  });

  describe('validate', () => {
    it('should validate and return safe user when user exists', async () => {
      const dbUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: '$2b$10$hashed',
        avatarColor: '#7185E8',
        avatarInitials: 'T',
        bio: null,
        timezone: 'UTC',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(dbUser);

      const result = await strategy.validate({ sub: 'user-1', email: 'test@example.com' });

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should throw UnauthorizedException when payload has no sub', async () => {
      await expect(
        strategy.validate({} as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user does not exist in DB', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        strategy.validate({ sub: 'deleted-user', email: 'test@example.com' }),
      ).rejects.toThrow(new UnauthorizedException('User account no longer exists'));
    });
  });
});

