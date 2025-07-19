import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fs module
vi.mock('fs');

// Mock logger
vi.mock('@playwright-orchestrator/shared', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@job-runner/services/s3Service', () => {
  return {
    S3Service: vi.fn().mockImplementation((config) => ({
      config,
      uploadFile: vi.fn(),
      uploadTrace: vi.fn(),
      uploadTestResults: vi.fn(),
      getPresignedUrl: vi.fn(),
      testConnection: vi.fn(),
      getContentType: vi.fn(),
      getPublicUrl: vi.fn(),
      getAllFiles: vi.fn(),
    })),
  };
});

// Import after mocking
import fs from 'fs';
import path from 'path';
import { S3Service } from '@job-runner/services/s3Service';

const mockFs = vi.mocked(fs);

describe('S3Service', () => {
  let s3Service: any;
  let mockConfig: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockConfig = {
      endpoint: 'http://localhost:9000',
      region: 'us-east-1',
      bucket: 'test-bucket',
      access_key_id: 'test-key',
      secret_access_key: 'test-secret',
      force_path_style: true,
    };

    s3Service = new S3Service(mockConfig);
    
    s3Service.uploadFile.mockResolvedValue('http://localhost:9000/test-bucket/uploads/test.txt');
    s3Service.uploadTrace.mockResolvedValue('http://localhost:9000/test-bucket/traces/run-123/trace.zip');
    s3Service.uploadTestResults.mockResolvedValue(['http://localhost:9000/test-bucket/results/run-123/index.html']);
    s3Service.getPresignedUrl.mockResolvedValue('https://presigned-url.example.com');
    s3Service.testConnection.mockResolvedValue(true);
    s3Service.getContentType.mockReturnValue('text/html');
    s3Service.getPublicUrl.mockReturnValue('http://localhost:9000/test-bucket/test-key');
    s3Service.getAllFiles.mockReturnValue(['/path/to/results/index.html']);
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockFileContent = Buffer.from('test file content');
      const localFilePath = '/path/to/test.txt';
      const s3Key = 'uploads/test.txt';

      // Mock file system
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockFileContent);

      const result = await s3Service.uploadFile(localFilePath, s3Key, 'text/plain');

      expect(result).toBe('http://localhost:9000/test-bucket/uploads/test.txt');
      expect(s3Service.uploadFile).toHaveBeenCalledWith(localFilePath, s3Key, 'text/plain');
    });

    it('should throw error if file does not exist', async () => {
      const localFilePath = '/path/to/nonexistent.txt';
      const s3Key = 'uploads/test.txt';

      mockFs.existsSync.mockReturnValue(false);
      
      const fileError = new Error('File not found: /path/to/nonexistent.txt');
      s3Service.uploadFile.mockRejectedValueOnce(fileError);

      await expect(s3Service.uploadFile(localFilePath, s3Key)).rejects.toThrow('File not found: /path/to/nonexistent.txt');
    });

    it('should handle S3 upload errors', async () => {
      const mockFileContent = Buffer.from('test file content');
      const localFilePath = '/path/to/test.txt';
      const s3Key = 'uploads/test.txt';

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockFileContent);

      const s3Error = new Error('S3 upload failed');
      s3Service.uploadFile.mockRejectedValueOnce(s3Error);

      await expect(s3Service.uploadFile(localFilePath, s3Key)).rejects.toThrow('S3 upload failed');
    });
  });

  describe('uploadTrace', () => {
    it('should upload trace file with correct key format', async () => {
      const traceFilePath = '/path/to/trace.zip';
      const runId = 'run-123';
      const mockFileContent = Buffer.from('trace content');

      s3Service.uploadTrace.mockResolvedValueOnce('http://localhost:9000/test-bucket/traces/run-123/1234567890/trace.zip');
      
      const result = await s3Service.uploadTrace(traceFilePath, runId);

      expect(result).toMatch(/http:\/\/localhost:9000\/test-bucket\/traces\/run-123\/.*\/trace\.zip/);
      expect(s3Service.uploadTrace).toHaveBeenCalledWith(traceFilePath, runId);
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

      const result = await s3Service.uploadTestResults(resultsDir, runId);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('http://localhost:9000/test-bucket/results/run-123/index.html');
      expect(s3Service.uploadTestResults).toHaveBeenCalledWith(resultsDir, runId);

      getAllFilesSpy.mockRestore();
    });

    it('should handle non-existent results directory', async () => {
      const resultsDir = '/path/to/nonexistent';
      const runId = 'run-123';

      mockFs.existsSync.mockReturnValue(false);
      
      s3Service.uploadTestResults.mockResolvedValueOnce([]);

      const result = await s3Service.uploadTestResults(resultsDir, runId);

      expect(result).toEqual([]);
      expect(s3Service.uploadTestResults).toHaveBeenCalledWith(resultsDir, runId);
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate presigned URL', async () => {
      const s3Key = 'traces/run-123/trace.zip';

      const result = await s3Service.getPresignedUrl(s3Key, 3600);

      expect(result).toBe('https://presigned-url.example.com');
      expect(s3Service.getPresignedUrl).toHaveBeenCalledWith(s3Key, 3600);
    });

    it('should handle presigned URL generation errors', async () => {
      const s3Key = 'traces/run-123/trace.zip';
      const presignedError = new Error('Presigned URL generation failed');

      s3Service.getPresignedUrl.mockRejectedValueOnce(presignedError);

      await expect(s3Service.getPresignedUrl(s3Key)).rejects.toThrow('Presigned URL generation failed');
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection test', async () => {
      const result = await s3Service.testConnection();

      expect(result).toBe(true);
      expect(s3Service.testConnection).toHaveBeenCalled();
    });

    it('should return false for failed connection test', async () => {
      s3Service.testConnection.mockResolvedValueOnce(false);

      const result = await s3Service.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getContentType', () => {
    it('should return correct content types for different file extensions', () => {
      s3Service.getContentType.mockImplementation((filePath: string) => {
        const ext = filePath.split('.').pop()?.toLowerCase();
        const contentTypes: Record<string, string> = {
          'html': 'text/html',
          'css': 'text/css',
          'js': 'application/javascript',
          'json': 'application/json',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'zip': 'application/zip',
        };
        return contentTypes[ext || ''] || 'application/octet-stream';
      });

      expect(s3Service.getContentType('test.html')).toBe('text/html');
      expect(s3Service.getContentType('test.css')).toBe('text/css');
      expect(s3Service.getContentType('test.js')).toBe('application/javascript');
      expect(s3Service.getContentType('test.json')).toBe('application/json');
      expect(s3Service.getContentType('test.png')).toBe('image/png');
      expect(s3Service.getContentType('test.jpg')).toBe('image/jpeg');
      expect(s3Service.getContentType('test.zip')).toBe('application/zip');
      expect(s3Service.getContentType('test.unknown')).toBe('application/octet-stream');
    });
  });

  describe('getPublicUrl', () => {
    it('should generate correct public URL for MinIO endpoint', () => {
      s3Service.getPublicUrl.mockImplementation((s3Key: string) => {
        return `http://localhost:9000/test-bucket/${s3Key}`;
      });

      const s3Key = 'traces/run-123/trace.zip';
      const result = s3Service.getPublicUrl(s3Key);

      expect(result).toBe('http://localhost:9000/test-bucket/traces/run-123/trace.zip');
    });

    it('should generate correct public URL for AWS S3', () => {
      const awsConfig = {
        ...mockConfig,
        endpoint: undefined,
      };

      const awsS3Service = new S3Service(awsConfig);
      awsS3Service.getPublicUrl = vi.fn().mockImplementation((s3Key: string) => {
        return `https://test-bucket.s3.us-east-1.amazonaws.com/${s3Key}`;
      });

      const s3Key = 'traces/run-123/trace.zip';
      const result = awsS3Service.getPublicUrl(s3Key);

      expect(result).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/traces/run-123/trace.zip');
    });
  });

  describe('getAllFiles', () => {
    it('should recursively find all files in directory', () => {
      const dirPath = '/path/to/results';

      s3Service.getAllFiles.mockImplementation((dirPath: string) => {
        return [
          '/path/to/results/index.html',
          '/path/to/results/assets/style.css',
          '/path/to/results/assets/script.js',
          '/path/to/results/screenshots/test1.png',
        ];
      });

      const result = s3Service.getAllFiles(dirPath);

      expect(result).toEqual([
        '/path/to/results/index.html',
        '/path/to/results/assets/style.css',
        '/path/to/results/assets/script.js',
        '/path/to/results/screenshots/test1.png',
      ]);
    });
  });
});

