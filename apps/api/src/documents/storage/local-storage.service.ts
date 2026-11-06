import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { StorageService, StoredFile } from './storage.interface';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly storageDir: string;

  constructor(private readonly configService: ConfigService) {
    const isVercel = Boolean(process.env.VERCEL);
    const defaultDir = isVercel
      ? path.resolve('/tmp', 'uploads', 'documents')
      : path.resolve(process.cwd(), 'uploads', 'documents');

    const configuredDir = this.configService.get<string>(
      'STORAGE_DIR',
      defaultDir,
    );
    this.storageDir = path.resolve(configuredDir);

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Validate storage key and return absolute safe path, preventing path traversal
   */
  private getSafeFilePath(storageKey: string): string {
    if (!storageKey || typeof storageKey !== 'string') {
      throw new BadRequestException('Storage key is required');
    }

    // Strip any leading slashes or directory traversal characters
    const sanitizedKey = path.normalize(storageKey).replace(/^(\.\.[\/\\])+/, '');
    const resolvedPath = path.resolve(this.storageDir, sanitizedKey);

    // Verify path is strictly within storageDir
    if (
      !resolvedPath.startsWith(this.storageDir + path.sep) &&
      resolvedPath !== this.storageDir
    ) {
      throw new BadRequestException(
        'Invalid storage key: directory traversal attempt detected',
      );
    }

    return resolvedPath;
  }

  /**
   * Generate safe unique filename
   */
  private generateSafeFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const uniqueId = crypto.randomUUID();
    return `${uniqueId}${ext}`;
  }

  async saveFile(
    file: Express.Multer.File,
    subDir: string = '',
  ): Promise<StoredFile> {
    try {
      const targetDir = subDir
        ? path.resolve(this.storageDir, subDir)
        : this.storageDir;

      if (!targetDir.startsWith(this.storageDir)) {
        throw new BadRequestException('Invalid subdirectory path');
      }

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const safeFilename = this.generateSafeFilename(file.originalname);
      const filePath = path.join(targetDir, safeFilename);

      // Relative storage key (not exposing absolute server filesystem path)
      const storageKey = subDir
        ? path.join(subDir, safeFilename).replace(/\\/g, '/')
        : safeFilename;

      await fs.promises.writeFile(filePath, file.buffer);

      return {
        storageKey,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Error saving file: ${(error as Error).message}`);
      throw new InternalServerErrorException('Failed to store document file');
    }
  }

  async getFileBuffer(storageKey: string): Promise<Buffer> {
    const safePath = this.getSafeFilePath(storageKey);
    try {
      return await fs.promises.readFile(safePath);
    } catch (error) {
      this.logger.error(
        `Error reading file ${storageKey}: ${(error as Error).message}`,
      );
      throw new BadRequestException('Document file could not be read');
    }
  }

  async deleteFile(storageKey: string): Promise<void> {
    try {
      const safePath = this.getSafeFilePath(storageKey);
      if (fs.existsSync(safePath)) {
        await fs.promises.unlink(safePath);
        this.logger.log(`Safely deleted stored file: ${storageKey}`);
      }
    } catch (error) {
      this.logger.warn(
        `Could not delete file ${storageKey}: ${(error as Error).message}`,
      );
      // Do not throw on cleanup failure so caller transaction can complete gracefully
    }
  }

  async fileExists(storageKey: string): Promise<boolean> {
    try {
      const safePath = this.getSafeFilePath(storageKey);
      return fs.existsSync(safePath);
    } catch {
      return false;
    }
  }
}

