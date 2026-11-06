import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  const testStorageDir = path.resolve(__dirname, '../../../test-uploads');

  beforeAll(() => {
    if (!fs.existsSync(testStorageDir)) {
      fs.mkdirSync(testStorageDir, { recursive: true });
    }
  });

  afterAll(async () => {
    if (fs.existsSync(testStorageDir)) {
      await fs.promises.rm(testStorageDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'STORAGE_DIR') return testStorageDir;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LocalStorageService>(LocalStorageService);
  });

  it('should save a file and return StoredFile metadata', async () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'annual-report.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 15,
      buffer: Buffer.from('test pdf buffer'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const stored = await service.saveFile(mockFile, 'test-ws');
    expect(stored.originalName).toBe('annual-report.pdf');
    expect(stored.size).toBe(15);
    expect(stored.storageKey).toMatch(/^test-ws\/[0-9a-f-]+\.pdf$/);

    const exists = await service.fileExists(stored.storageKey);
    expect(exists).toBe(true);

    const readBuf = await service.getFileBuffer(stored.storageKey);
    expect(readBuf.toString('utf-8')).toBe('test pdf buffer');

    await service.deleteFile(stored.storageKey);
    expect(await service.fileExists(stored.storageKey)).toBe(false);
  });

  it('should reject directory traversal in storage key when reading', async () => {
    await expect(
      service.getFileBuffer('../../../etc/passwd'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject directory traversal in subDir when saving', async () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'exploit.txt',
      encoding: '7bit',
      mimetype: 'text/plain',
      size: 4,
      buffer: Buffer.from('data'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    await expect(
      service.saveFile(mockFile, '../../dangerous'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should handle deletion of non-existent file without throwing', async () => {
    await expect(
      service.deleteFile('non-existent-uuid.txt'),
    ).resolves.not.toThrow();
  });
});

