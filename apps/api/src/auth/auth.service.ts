import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, WorkspaceRole, MemberStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  RegisterResponse,
  LoginResponse,
  MeResponse,
  SafeUser,
  SafeWorkspace,
  MembershipInfo,
} from './interfaces/auth-response.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) { }

  /**
   * Helper to normalize email addresses (trim whitespace & lowercase)
   */
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Helper to compute avatar initials from a user's full name
   */
  private computeInitials(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return 'U';
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Strip sensitive fields and relations from user object
   */
  private sanitizeUser(user: {
    id: string;
    email: string;
    name: string | null;
    avatarColor: string | null;
    avatarInitials: string | null;
    bio: string | null;
    timezone: string | null;
    createdAt: Date;
    updatedAt: Date;
    passwordHash?: string;
    memberships?: any;
    documents?: any;
    conversations?: any;
    activities?: any;
  }): SafeUser {
    const {
      passwordHash: _hash,
      memberships: _memberships,
      documents: _documents,
      conversations: _conversations,
      activities: _activities,
      ...safeUser
    } = user;
    return safeUser;
  }

  /**
   * Safe serialization of workspace converting BigInt to Number
   */
  private serializeWorkspace(workspace: {
    id: string;
    name: string;
    description: string | null;
    plan: string;
    storageLimitBytes: bigint | number;
    createdAt: Date;
    updatedAt: Date;
  }): SafeWorkspace {
    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      plan: workspace.plan,
      storageLimitBytes: Number(workspace.storageLimitBytes),
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }

  /**
   * Generate JWT access token for an authenticated user
   */
  private generateToken(user: { id: string; email: string }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };
    return this.jwtService.sign(payload);
  }

  /**
   * Register a new user with default workspace and OWNER membership
   */
  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const normalizedEmail = this.normalizeEmail(dto.email);
    const fullName = dto.name.trim();

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email address already exists');
    }

    // Securely hash password
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    const avatarInitials = this.computeInitials(fullName);
    const workspaceName = `${fullName}'s Workspace`;

    try {
      // Transactionally create user, default workspace, and owner membership
      const { user, workspace } = await this.prisma.$transaction(
        async (tx) => {
          // 1. Create user
          const newUser = await tx.user.create({
            data: {
              email: normalizedEmail,
              name: fullName,
              passwordHash,
              avatarInitials,
            },
          });

          // 2. Create default workspace
          const newWorkspace = await tx.workspace.create({
            data: {
              name: workspaceName,
              description: `Default workspace for ${fullName}`,
            },
          });

          // 3. Assign OWNER role and ACTIVE status
          await tx.workspaceMember.create({
            data: {
              workspaceId: newWorkspace.id,
              userId: newUser.id,
              role: WorkspaceRole.OWNER,
              status: MemberStatus.ACTIVE,
            },
          });

          return { user: newUser, workspace: newWorkspace };
        },
      );

      const accessToken = this.generateToken(user);

      return {
        accessToken,
        user: this.sanitizeUser(user),
        workspace: {
          ...this.serializeWorkspace(workspace),
          role: WorkspaceRole.OWNER,
        },
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A user with this email address already exists');
      }
      this.logger.error(`Registration error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Authenticate user with email and password
   */
  async login(dto: LoginDto): Promise<LoginResponse> {
    const normalizedEmail = this.normalizeEmail(dto.email);

    // Generic error to avoid revealing user existence
    const invalidCredentialsError = new UnauthorizedException('Invalid email or password');

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw invalidCredentialsError;
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw invalidCredentialsError;
    }

    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Retrieve profile and workspace memberships for current user
   */
  async getProfile(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            workspace: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    const memberships: MembershipInfo[] = user.memberships.map((membership) => ({
      id: membership.id,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joinedAt,
      workspace: this.serializeWorkspace(membership.workspace),
    }));

    return {
      user: this.sanitizeUser(user),
      memberships,
    };
  }

  /**
   * Update profile information for an authenticated user
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      data.name = trimmedName;
      data.avatarInitials = this.computeInitials(trimmedName);
    }

    if (dto.bio !== undefined) {
      data.bio = dto.bio;
    }

    if (dto.timezone !== undefined) {
      data.timezone = dto.timezone;
    }

    if (dto.avatarColor !== undefined) {
      data.avatarColor = dto.avatarColor;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.sanitizeUser(updatedUser);
  }
}
