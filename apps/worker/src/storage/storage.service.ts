import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: Minio.Client;

  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
      port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    });
  }

  async onModuleInit() {
    try {
      await this.ensureBucket('snapshots');
      this.logger.log('MinIO connected and snapshots bucket ready');
    } catch (err) {
      this.logger.warn('MinIO not available at startup — will retry on use', err);
    }
  }

  async ensureBucket(bucket: string): Promise<void> {
    try {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket, process.env.MINIO_REGION ?? 'us-east-1');
        this.logger.log(`Created MinIO bucket: ${bucket}`);
      }
    } catch (err) {
      this.logger.error(`Failed to ensure bucket "${bucket}":`, err);
      throw err;
    }
  }

  async putObject(bucket: string, key: string, data: string): Promise<void> {
    try {
      const buffer = Buffer.from(data, 'utf-8');
      await this.client.putObject(bucket, key, buffer, buffer.length, {
        'Content-Type': 'application/json',
      });
      this.logger.debug(`Uploaded object: ${bucket}/${key}`);
    } catch (err) {
      this.logger.error(`Failed to put object "${bucket}/${key}":`, err);
      throw err;
    }
  }

  async getObject(bucket: string, key: string): Promise<string> {
    try {
      const stream = await this.client.getObject(bucket, key);
      return new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        stream.on('error', reject);
      });
    } catch (err) {
      this.logger.error(`Failed to get object "${bucket}/${key}":`, err);
      throw err;
    }
  }
}
