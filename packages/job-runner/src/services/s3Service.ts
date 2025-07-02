import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { logger, S3Config } from '@playwright-orchestrator/shared';

export class S3Service {
  private client: S3Client;
  private config: S3Config;

  constructor(config: S3Config) {
    this.config = config;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.access_key_id,
        secretAccessKey: config.secret_access_key,
      },
      forcePathStyle: config.force_path_style,
    });
  }

  /**
   * Upload a file to S3
   */
  public async uploadFile(
    localFilePath: string,
    s3Key: string,
    contentType: string = 'application/octet-stream'
  ): Promise<string> {
    try {
      if (!fs.existsSync(localFilePath)) {
        throw new Error(`File not found: ${localFilePath}`);
      }

      const fileContent = fs.readFileSync(localFilePath);
      
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType,
      });

      await this.client.send(command);

      // Generate the public URL
      const publicUrl = this.getPublicUrl(s3Key);
      
      logger.info('File uploaded to S3', {
        localFilePath,
        s3Key,
        bucket: this.config.bucket,
        publicUrl,
        fileSize: fileContent.length,
      });

      return publicUrl;
    } catch (error) {
      logger.error('Failed to upload file to S3', {
        localFilePath,
        s3Key,
        bucket: this.config.bucket,
        error,
      });
      throw error;
    }
  }

  /**
   * Upload Playwright trace file
   */
  public async uploadTrace(
    traceFilePath: string,
    runId: string
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const s3Key = `traces/${runId}/${timestamp}/trace.zip`;
    
    return this.uploadFile(traceFilePath, s3Key, 'application/zip');
  }

  /**
   * Upload test results (HTML report, screenshots, etc.)
   */
  public async uploadTestResults(
    resultsDir: string,
    runId: string
  ): Promise<string[]> {
    const uploadedFiles: string[] = [];
    
    if (!fs.existsSync(resultsDir)) {
      logger.warn('Results directory not found', { resultsDir });
      return uploadedFiles;
    }

    try {
      const files = this.getAllFiles(resultsDir);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      for (const filePath of files) {
        const relativePath = path.relative(resultsDir, filePath);
        const s3Key = `results/${runId}/${timestamp}/${relativePath}`;
        
        const contentType = this.getContentType(filePath);
        const publicUrl = await this.uploadFile(filePath, s3Key, contentType);
        uploadedFiles.push(publicUrl);
      }

      logger.info('Test results uploaded', {
        runId,
        resultsDir,
        uploadedCount: uploadedFiles.length,
      });

      return uploadedFiles;
    } catch (error) {
      logger.error('Failed to upload test results', {
        runId,
        resultsDir,
        error,
      });
      throw error;
    }
  }

  /**
   * Generate a presigned URL for downloading a file
   */
  public async getPresignedUrl(
    s3Key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: s3Key,
      });

      const presignedUrl = await getSignedUrl(this.client, command, {
        expiresIn,
      });

      return presignedUrl;
    } catch (error) {
      logger.error('Failed to generate presigned URL', {
        s3Key,
        bucket: this.config.bucket,
        error,
      });
      throw error;
    }
  }

  /**
   * Get public URL for a file (works with public buckets or when using MinIO)
   */
  private getPublicUrl(s3Key: string): string {
    if (this.config.endpoint) {
      // For MinIO or custom S3 endpoints
      const baseUrl = this.config.endpoint.replace(/\/$/, '');
      return `${baseUrl}/${this.config.bucket}/${s3Key}`;
    } else {
      // For AWS S3
      return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${s3Key}`;
    }
  }

  /**
   * Get all files recursively from a directory
   */
  private getAllFiles(dirPath: string): string[] {
    const files: string[] = [];
    
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Determine content type based on file extension
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const contentTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.zip': 'application/zip',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.xml': 'application/xml',
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Test S3 connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      // Try to list objects in the bucket (this will fail if we don't have access)
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: 'test-connection.txt',
        Body: 'Connection test',
        ContentType: 'text/plain',
      });

      await this.client.send(command);
      
      logger.info('S3 connection test successful', {
        bucket: this.config.bucket,
        endpoint: this.config.endpoint,
      });
      
      return true;
    } catch (error) {
      logger.error('S3 connection test failed', {
        bucket: this.config.bucket,
        endpoint: this.config.endpoint,
        error,
      });
      return false;
    }
  }
}

