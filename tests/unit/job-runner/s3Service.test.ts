import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import fs from 'fs';
import path from 'path';
import { S3Service } from '@job-runner/services/s3Service';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

// Mock fs module
vi.mock('fs');
const mockFs = vi.mocked(fs);

// Mock logger
vi.mock('@playwright-orchestrator/shared', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('S3Service', () => {
  let s3Service: S3Service;
  let mockS3Client: any;
  let mockConfig: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      endpoint: 'http://localhost:9000',
      region: 'us-east-1',
      bucket: 'test-bucket',
      access_key_id: 'test-key',
      secret_access_key: 'test-secret',
      force_path_style: true,
    };

    mockS3Client = {
      send: vi.fn(),
    };

    const { S3Client } = await import('@aws-sdk/client-s3');
    (S3Client as Mock).mockReturnValue(mockS3Client);

    s3Service = new S3Service(mockConfig);
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockFileContent = Buffer.from('test file content');
      const localFilePath = '/path/to/test.txt';
      const s3Key = 'uploads/test.txt';

      // Mock file system
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockFileContent);

      // Mock S3 client
      mockS3Client.send.mockResolvedValueOnce({});

      const result = await s3Service.uploadFile(localFilePath, s3Key, 'text/plain');

      expect(result).toBe('http://localhost:9000/test-bucket/uploads/test.txt');
      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      expect(mockFs.existsSync).toHaveBeenCalledWith(localFilePath);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(localFilePath);
    });

    it('should throw error if file does not exist', async () => {
      const localFilePath = '/path/to/nonexistent.txt';
      const s3Key = 'uploads/test.txt';

      mockFs.existsSync.mockReturnValue(false);

      await expect(s3Service.uploadFile(localFilePath, s3Key)).rejects.toThrow('File not found: /path/to/nonexistent.txt');
    });

    it('should handle S3 upload errors', async () => {
      const mockFileContent = Buffer.from('test file content');
      const localFilePath = '/path/to/test.txt';
      const s3Key = 'uploads/test.txt';

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockFileContent);

      const s3Error = new Error('S3 upload failed');
      mockS3Client.send.mockRejectedValueOnce(s3Error);

      await expect(s3Service.uploadFile(localFilePath, s3Key)).rejects.toThrow('S3 upload failed');
    });
  });

  describe('uploadTrace', () => {
    it('should upload trace file with correct key format', async () => {
      const traceFilePath = '/path/to/trace.zip';
      const runId = 'run-123';
      const mockFileContent = Buffer.from('trace content');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockFileContent);
      mockS3Client.send.mockResolvedValueOnce({});

      const result = await s3Service.uploadTrace(traceFilePath, runId);

      expect(result).toMatch(/http:\/\/localhost:9000\/test-bucket\/traces\/run-123\/.*\/trace\.zip/);
      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('uploadTestResults', () => {
    it('should upload multiple files from results directory', async () => {
      const resultsDir = '/path/to/results';
      const runId = 'run-123';

      // Mock directory structure
      const mockFiles = [
        '/path/to/results/index.html',
        '/path/to/results/assets/style.css',
        '/path/to/results/screenshots/test1.png',
      ];

      // Mock getAllFiles method
      const getAllFilesSpy = vi.spyOn(s3Service as any, 'getAllFiles');
      getAllFilesSpy.mockReturnValue(mockFiles);

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(Buffer.from('file content'));
      mockS3Client.send.mockResolvedValue({});

      const result = await s3Service.uploadTestResults(resultsDir, runId);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatch(/http:\/\/localhost:9000\/test-bucket\/results\/run-123\/.*\/index\.html/);
      expect(mockS3Client.send).toHaveBeenCalledTimes(3);

      getAllFilesSpy.mockRestore();
    });

    it('should handle non-existent results directory', async () => {
      const resultsDir = '/path/to/nonexistent';
      const runId = 'run-123';

      mockFs.existsSync.mockReturnValue(false);

      const result = await s3Service.uploadTestResults(resultsDir, runId);

      expect(result).toEqual([]);
      expect(mockS3Client.send).not.toHaveBeenCalled();
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate presigned URL', async () => {
      const s3Key = 'traces/run-123/trace.zip';
      const mockPresignedUrl = 'https://presigned-url.example.com';

      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      (getSignedUrl as Mock).mockResolvedValueOnce(mockPresignedUrl);

      const result = await s3Service.getPresignedUrl(s3Key, 3600);

      expect(result).toBe(mockPresignedUrl);
      expect(getSignedUrl).toHaveBeenCalledTimes(1);
    });

    it('should handle presigned URL generation errors', async () => {
      const s3Key = 'traces/run-123/trace.zip';
      const presignedError = new Error('Presigned URL generation failed');

      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      (getSignedUrl as Mock).mockRejectedValueOnce(presignedError);

      await expect(s3Service.getPresignedUrl(s3Key)).rejects.toThrow('Presigned URL generation failed');
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection test', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      const result = await s3Service.testConnection();

      expect(result).toBe(true);
      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
    });

    it('should return false for failed connection test', async () => {
      const connectionError = new Error('Connection failed');
      mockS3Client.send.mockRejectedValueOnce(connectionError);

      const result = await s3Service.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getContentType', () => {
    it('should return correct content types for different file extensions', () => {
      const getContentType = (s3Service as any).getContentType.bind(s3Service);

      expect(getContentType('test.html')).toBe('text/html');
      expect(getContentType('test.css')).toBe('text/css');
      expect(getContentType('test.js')).toBe('application/javascript');
      expect(getContentType('test.json')).toBe('application/json');
      expect(getContentType('test.png')).toBe('image/png');
      expect(getContentType('test.jpg')).toBe('image/jpeg');
      expect(getContentType('test.zip')).toBe('application/zip');
      expect(getContentType('test.unknown')).toBe('application/octet-stream');
    });
  });

  describe('getPublicUrl', () => {
    it('should generate correct public URL for MinIO endpoint', () => {
      const getPublicUrl = (s3Service as any).getPublicUrl.bind(s3Service);
      const s3Key = 'traces/run-123/trace.zip';

      const result = getPublicUrl(s3Key);

      expect(result).toBe('http://localhost:9000/test-bucket/traces/run-123/trace.zip');
    });

    it('should generate correct public URL for AWS S3', () => {
      const awsConfig = {
        ...mockConfig,
        endpoint: undefined, // No custom endpoint for AWS
      };

      const awsS3Service = new S3Service(awsConfig);
      const getPublicUrl = (awsS3Service as any).getPublicUrl.bind(awsS3Service);
      const s3Key = 'traces/run-123/trace.zip';

      const result = getPublicUrl(s3Key);

      expect(result).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/traces/run-123/trace.zip');
    });
  });

  describe('getAllFiles', () => {
    it('should recursively find all files in directory', () => {
      const dirPath = '/path/to/results';

      // Mock directory structure
      mockFs.readdirSync.mockImplementation((path) => {
        if (path === dirPath) {
          return ['index.html', 'assets', 'screenshots'];
        } else if (path === '/path/to/results/assets') {
          return ['style.css', 'script.js'];
        } else if (path === '/path/to/results/screenshots') {
          return ['test1.png'];
        }
        return [];
      });

      mockFs.statSync.mockImplementation((path) => ({
        isDirectory: () => {
          return path.includes('assets') || path.includes('screenshots');
        },
      }));

      const getAllFiles = (s3Service as any).getAllFiles.bind(s3Service);
      const result = getAllFiles(dirPath);

      expect(result).toEqual([
        '/path/to/results/index.html',
        '/path/to/results/assets/style.css',
        '/path/to/results/assets/script.js',
        '/path/to/results/screenshots/test1.png',
      ]);
    });
  });
});

