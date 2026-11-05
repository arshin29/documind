import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should return user if present without error', () => {
    const user = { id: '1', email: 'test@example.com' };
    const result = guard.handleRequest(null, user, null, {} as any);
    expect(result).toEqual(user);
  });

  it('should throw UnauthorizedException when token is expired', () => {
    expect(() =>
      guard.handleRequest(
        null,
        false,
        { name: 'TokenExpiredError' },
        {} as any,
      ),
    ).toThrow(new UnauthorizedException('Token has expired'));
  });

  it('should throw UnauthorizedException when token is malformed', () => {
    expect(() =>
      guard.handleRequest(
        null,
        false,
        { name: 'JsonWebTokenError' },
        {} as any,
      ),
    ).toThrow(new UnauthorizedException('Malformed or invalid token'));
  });

  it('should throw UnauthorizedException when token is missing', () => {
    expect(() =>
      guard.handleRequest(null, false, null, {} as any),
    ).toThrow(new UnauthorizedException('Authentication required'));
  });
});

