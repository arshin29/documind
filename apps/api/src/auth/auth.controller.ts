import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  RegisterResponse,
  LoginResponse,
  MeResponse,
  SafeUser,
} from './interfaces/auth-response.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user and create their default workspace
   * POST /api/auth/register
   */
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(dto);
  }

  /**
   * Log in an existing user
   * POST /api/auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  /**
   * Get current authenticated user's profile and workspace memberships
   * GET /api/auth/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: SafeUser): Promise<MeResponse> {
    return this.authService.getProfile(user.id);
  }

  /**
   * Update current authenticated user's profile
   * PATCH /api/auth/profile
   */
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: SafeUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<SafeUser> {
    return this.authService.updateProfile(user.id, dto);
  }
}
