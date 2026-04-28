import { describe, expect, it } from 'vitest';
import { ValidationError } from '../api/lib/errors';
import {
  LocalDeliveryProvider,
  LocalStorageProvider,
  NoopTransformProvider,
} from '../api/modules/media/media.providers';
import { InMemoryMediaRepository } from '../api/modules/media/media.repository';
import { inferMediaKind, MediaService } from '../api/modules/media/media.service';

const userId = '550e8400-e29b-41d4-a716-446655440000';

const createService = () =>
  new MediaService({
    repository: new InMemoryMediaRepository(),
    storageProviders: [new LocalStorageProvider('http://media.test/upload')],
    deliveryProviders: [
      new LocalDeliveryProvider(
        'http://media.test/delivery',
        () => new Date('2026-04-28T00:00:00.000Z')
      ),
    ],
    transformProvider: new NoopTransformProvider(),
    now: () => new Date('2026-04-28T00:00:00.000Z'),
  });

describe('media service', () => {
  it('infers media kind from MIME type', () => {
    expect(inferMediaKind('image/jpeg')).toBe('image');
    expect(inferMediaKind('video/mp4')).toBe('video');
    expect(inferMediaKind('audio/mpeg')).toBe('audio');
    expect(inferMediaKind('application/pdf')).toBe('document');
    expect(inferMediaKind('application/zip')).toBe('archive');
    expect(inferMediaKind('application/x-custom')).toBe('unknown');
  });

  it('creates upload intents without exposing storage handles', async () => {
    const service = createService();

    const result = await service.createUploadIntent({
      ownerId: userId,
      ownerType: 'user',
      originalFilename: 'cover.png',
      mimeType: 'image/png',
      byteSize: 1024,
      visibility: 'restricted',
    });

    expect(result.asset.status).toBe('pending_upload');
    expect(result.asset.mediaKind).toBe('image');
    expect(result.asset.providerKey).toBe('local');
    expect('storageHandle' in result.asset).toBe(false);
    expect(result.providerUpload.url).toBe(`http://media.test/upload/${result.asset.id}`);
  });

  it('completes an upload and returns a private editor URL', async () => {
    const service = createService();
    const { asset } = await service.createUploadIntent({
      ownerId: userId,
      ownerType: 'user',
      originalFilename: 'voice.mp3',
      mimeType: 'audio/mpeg',
      byteSize: 2048,
      visibility: 'private',
    });

    const completed = await service.completeUpload(asset.id, {}, userId);
    const delivery = await service.createDeliveryUrl(
      completed.id,
      {
        purpose: 'editor',
        ttlSeconds: 300,
      },
      userId
    );

    expect(completed.status).toBe('ready');
    expect(delivery.url).toContain('http://media.test/delivery/');
    expect(delivery.expiresAt).toBe('2026-04-28T00:05:00.000Z');
  });

  it('rejects unsupported upload MIME types', async () => {
    const service = createService();

    await expect(
      service.createUploadIntent({
        ownerId: userId,
        ownerType: 'user',
        originalFilename: 'binary.bin',
        mimeType: 'application/x-msdownload',
        byteSize: 1024,
        visibility: 'private',
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
