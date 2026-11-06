export interface StoredFile {
  storageKey: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export abstract class StorageService {
  abstract saveFile(
    file: Express.Multer.File,
    subDir?: string,
  ): Promise<StoredFile>;

  abstract getFileBuffer(storageKey: string): Promise<Buffer>;

  abstract deleteFile(storageKey: string): Promise<void>;

  abstract fileExists(storageKey: string): Promise<boolean>;
}

