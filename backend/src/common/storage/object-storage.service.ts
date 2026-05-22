import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('S3_BUCKET') &&
        this.config.get<string>('S3_ACCESS_KEY_ID') &&
        this.config.get<string>('S3_SECRET_ACCESS_KEY'),
    );
  }

  private getClient(): S3Client {
    if (!this.client) {
      const endpoint = this.config.get<string>('S3_ENDPOINT');
      const region = this.config.get<string>('S3_REGION') ?? 'auto';
      this.client = new S3Client({
        region,
        ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
        credentials: {
          accessKeyId: this.config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
          secretAccessKey: this.config.getOrThrow<string>(
            'S3_SECRET_ACCESS_KEY',
          ),
        },
      });
    }
    return this.client;
  }

  /**
   * Uploads remote or data-URL poster bytes to S3-compatible storage when configured.
   * Returns a public HTTPS URL or the original URL if storage is not configured.
   */
  async persistPosterUrl(
    sourceUrl: string,
    keyPrefix = 'campaigns/posters',
  ): Promise<string> {
    if (!this.isConfigured()) {
      return sourceUrl;
    }

    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch poster: ${response.status}`);
    }
    const contentType =
      response.headers.get('content-type') ?? 'image/png';
    const body = Buffer.from(await response.arrayBuffer());
    const ext = contentType.includes('jpeg')
      ? 'jpg'
      : contentType.includes('webp')
        ? 'webp'
        : 'png';
    const key = `${keyPrefix}/${randomUUID()}.${ext}`;
    const bucket = this.config.getOrThrow<string>('S3_BUCKET');

    await this.getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    const publicBase = this.config.get<string>('S3_PUBLIC_BASE_URL');
    if (publicBase) {
      return `${publicBase.replace(/\/$/, '')}/${key}`;
    }

    const endpoint = this.config.get<string>('S3_ENDPOINT');
    if (endpoint) {
      return `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`;
    }

    const region = this.config.get<string>('S3_REGION') ?? 'us-east-1';
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    this.logger.log({ key, url }, 'Poster uploaded to object storage');
    return url;
  }
}
