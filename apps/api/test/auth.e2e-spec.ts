import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { WorkspaceRole, MemberStatus } from '@prisma/client';

describe('Authentication & Workspace E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testEmail = `auth_test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Alex Mercer';
  let authToken: string;
  let createdUserId: string;
  let createdWorkspaceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Replicate main.ts configuration
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Clean up test data if created
    if (createdUserId) {
      await prisma.user.deleteMany({
        where: { id: createdUserId },
      });
    }
    if (createdWorkspaceId) {
      await prisma.workspace.deleteMany({
        where: { id: createdWorkspaceId },
      });
    }
    await app.close();
  });

  describe('Health Endpoint Verification', () => {
    it('GET /api/health - should remain operational', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'DocuMind API');
    });
  });

  describe('Registration Flow - POST /api/auth/register', () => {
    it('should reject registration when required fields are missing or invalid', async () => {
      // Invalid email
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Invalid User',
          email: 'not-an-email',
          password: 'validPassword123',
        })
        .expect(400);

      // Password too short (< 8 chars)
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Invalid User',
          email: 'valid@example.com',
          password: 'short',
        })
        .expect(400);

      // Missing name
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'valid@example.com',
          password: 'validPassword123',
        })
        .expect(400);
    });

    it('1. Successful registration - creates user, default workspace, OWNER member, returns JWT and safe user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: `  ${testName}  `, // test trimming
          email: `  ${testEmail.toUpperCase()}  `, // test normalization to lowercase and trimming
          password: testPassword,
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
      authToken = response.body.accessToken;

      // Safe user assertions
      const user = response.body.user;
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      createdUserId = user.id;
      expect(user.name).toBe(testName);
      expect(user.email).toBe(testEmail.toLowerCase());
      expect(user.avatarInitials).toBe('AM');

      // CRITICAL: Ensure password hash is NEVER returned
      expect(user.passwordHash).toBeUndefined();
      expect(user.password).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');

      // Safe workspace assertions
      const workspace = response.body.workspace;
      expect(workspace).toBeDefined();
      expect(workspace.id).toBeDefined();
      createdWorkspaceId = workspace.id;
      expect(workspace.name).toBe(`${testName}'s Workspace`);
      expect(workspace.role).toBe(WorkspaceRole.OWNER);
      expect(typeof workspace.storageLimitBytes).toBe('number');
    });

    it('9. Default workspace creation - verifies DB record', async () => {
      const dbWorkspace = await prisma.workspace.findUnique({
        where: { id: createdWorkspaceId },
      });
      expect(dbWorkspace).not.toBeNull();
      expect(dbWorkspace?.name).toBe(`${testName}'s Workspace`);
    });

    it('10. OWNER membership creation - verifies DB record', async () => {
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: createdWorkspaceId,
            userId: createdUserId,
          },
        },
      });
      expect(membership).not.toBeNull();
      expect(membership?.role).toBe(WorkspaceRole.OWNER);
      expect(membership?.status).toBe(MemberStatus.ACTIVE);
    });

    it('2. Duplicate email registration - rejects with HTTP 409 Conflict', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: testEmail.toLowerCase(), // same email
          password: 'differentPassword123',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(409);
      expect(response.body.message).toMatch(/already exists/i);
    });
  });

  describe('Login Flow - POST /api/auth/login', () => {
    it('3. Successful login - returns JWT and safe user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: `  ${testEmail.toUpperCase()}  `,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(createdUserId);
      expect(response.body.user.email).toBe(testEmail.toLowerCase());

      // 11. Password hash not being returned in API responses
      expect(response.body.user.passwordHash).toBeUndefined();
      expect(response.body.user.password).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });

    it('4. Incorrect password - rejects with 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'wrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toMatch(/Invalid email or password/i);
    });

    it('5. Unknown email - rejects with 401 Unauthorized using generic error', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'unknown_nonexistent_user@example.com',
          password: 'somePassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(401);
      // Ensures user existence is not leaked
      expect(response.body.message).toMatch(/Invalid email or password/i);
    });
  });

  describe('Current User Profile - GET /api/auth/me', () => {
    it('6. Accessing /api/auth/me without a token - rejects with 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(401);
    });

    it('7. Accessing /api/auth/me with an invalid / malformed token - rejects with 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.malformed.token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toMatch(/Malformed or invalid token|Authentication required/i);
    });

    it('8. Accessing /api/auth/me with a valid token - returns user profile and workspace memberships', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const body = response.body;
      expect(body).toHaveProperty('user');
      expect(body).toHaveProperty('memberships');

      // User profile assertions
      expect(body.user.id).toBe(createdUserId);
      expect(body.user.email).toBe(testEmail.toLowerCase());
      expect(body.user.name).toBe(testName);
      expect(body.user.avatarInitials).toBe('AM');

      // 11. Never expose password hash
      expect(body.user.passwordHash).toBeUndefined();
      expect(body.user.password).toBeUndefined();
      expect(JSON.stringify(body)).not.toContain('passwordHash');

      // Workspace memberships assertions
      expect(Array.isArray(body.memberships)).toBe(true);
      expect(body.memberships.length).toBeGreaterThanOrEqual(1);

      const ownerMembership = body.memberships.find(
        (m: any) => m.workspace.id === createdWorkspaceId,
      );
      expect(ownerMembership).toBeDefined();
      expect(ownerMembership.role).toBe(WorkspaceRole.OWNER);
      expect(ownerMembership.status).toBe(MemberStatus.ACTIVE);
      expect(ownerMembership.workspace.name).toBe(`${testName}'s Workspace`);
      expect(typeof ownerMembership.workspace.storageLimitBytes).toBe('number');
    });
  });

  describe('Update Profile Flow - PATCH /api/auth/profile', () => {
    it('should reject unauthenticated profile updates with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .patch('/api/auth/profile')
        .send({ name: 'Unauthorized Name' })
        .expect(401);
    });

    it('should reject invalid profile updates (name too short)', async () => {
      await request(app.getHttpServer())
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'A' })
        .expect(400);
    });

    it('should reject attempts to modify non-editable fields like email', async () => {
      await request(app.getHttpServer())
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'newemail@example.com' })
        .expect(400);
    });

    it('should successfully update user profile name and compute avatar initials', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Sarah Connor',
          bio: 'Cyberdyne Systems Researcher',
          timezone: 'America/New_York',
          avatarColor: '#29A36A',
        })
        .expect(200);

      const user = response.body;
      expect(user.id).toBe(createdUserId);
      expect(user.name).toBe('Sarah Connor');
      expect(user.avatarInitials).toBe('SC');
      expect(user.bio).toBe('Cyberdyne Systems Researcher');
      expect(user.timezone).toBe('America/New_York');
      expect(user.avatarColor).toBe('#29A36A');
      expect(user.email).toBe(testEmail.toLowerCase());

      // Verify persistence in DB
      const dbUser = await prisma.user.findUnique({
        where: { id: createdUserId },
      });
      expect(dbUser?.name).toBe('Sarah Connor');
      expect(dbUser?.avatarInitials).toBe('SC');

      // Verify GET /api/auth/me returns updated name
      const meResponse = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(meResponse.body.user.name).toBe('Sarah Connor');
      expect(meResponse.body.user.avatarInitials).toBe('SC');
    });
  });
});

