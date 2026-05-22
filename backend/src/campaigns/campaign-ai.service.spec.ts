import { ConfigService } from '@nestjs/config';
import { ObjectStorageService } from '../common/storage/object-storage.service';
import { CampaignAiService } from './campaign-ai.service';

describe('CampaignAiService', () => {
  const originalFetch = global.fetch;

  function createService(env: Record<string, string | undefined>): CampaignAiService {
    const config = {
      get: (key: string) => env[key],
    } as ConfigService;
    const objectStorage = {
      isConfigured: () => false,
      persistPosterUrl: async (url: string) => url,
    } as ObjectStorageService;
    return new CampaignAiService(config, objectStorage);
  }

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('extractOpenRouterImageUrl', () => {
    const service = createService({});

    it('reads snake_case image_url', () => {
      const url = service.extractOpenRouterImageUrl({
        choices: [
          {
            message: {
              images: [
                {
                  type: 'image_url',
                  image_url: { url: 'data:image/png;base64,abc123' },
                },
              ],
            },
          },
        ],
      });
      expect(url).toBe('data:image/png;base64,abc123');
    });

    it('reads camelCase imageUrl', () => {
      const url = service.extractOpenRouterImageUrl({
        choices: [
          {
            message: {
              images: [{ imageUrl: { url: 'data:image/png;base64,xyz' } }],
            },
          },
        ],
      });
      expect(url).toBe('data:image/png;base64,xyz');
    });

    it('returns null when images missing', () => {
      expect(service.extractOpenRouterImageUrl({ choices: [{}] })).toBeNull();
    });
  });

  describe('generatePosterSync', () => {
    it('uses OpenRouter chat completions and returns data URL', async () => {
      const pngBase64 = Buffer.alloc(12_000, 1).toString('base64');
      const dataUrl = `data:image/png;base64,${pngBase64}`;

      global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
        const body = JSON.parse((init?.body as string) ?? '{}');
        if (body.modalities?.includes('image')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              choices: [
                {
                  message: {
                    images: [{ image_url: { url: dataUrl } }],
                  },
                },
              ],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content:
                    'Minimal professional poster with a bold red circle, clean white background, headline text area, and limited time offer banner.',
                },
              },
            ],
          }),
        });
      }) as typeof fetch;

      const service = createService({
        OPENROUTER_API_KEY: 'test-key',
        CAMPAIGNS_POLLINATIONS_FALLBACK: 'false',
      });

      const result = await service.generatePosterSync({
        imageDescription: 'red circle on white background',
      });

      expect(result.source).toBe('openrouter');
      expect(result.posterUrl).toBe(dataUrl);
      expect(result.imagePrompt.length).toBeGreaterThan(40);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({ method: 'POST' }),
      );
      const imageCall = (global.fetch as jest.Mock).mock.calls.find(
        (call: [string, RequestInit]) => {
          const body = JSON.parse((call[1]?.body as string) ?? '{}');
          return body.modalities?.includes('image');
        },
      );
      expect(imageCall).toBeDefined();
      const imageBody = JSON.parse((imageCall![1].body as string) ?? '{}');
      expect(imageBody.modalities).toEqual(['image']);
    });

    it('falls back to Pollinations when OpenRouter returns no images', async () => {
      const imageBytes = Buffer.alloc(12_000, 2);
      let callCount = 0;

      global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
        callCount += 1;
        if (url.includes('openrouter.ai')) {
          const body = JSON.parse((init?.body as string) ?? '{}');
          if (body.modalities?.includes('image')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({ choices: [{ message: {} }] }),
            });
          }
          return Promise.resolve({
            ok: true,
            json: async () => ({
              choices: [
                {
                  message: {
                    content:
                      'Vibrant promotional poster with headline, offer badge, and limited time offer text.',
                  },
                },
              ],
            }),
          });
        }
        if (init?.method === 'GET') {
          return Promise.resolve({
            ok: true,
            headers: { get: () => 'image/png' },
            arrayBuffer: async () => imageBytes.buffer,
          });
        }
        return Promise.reject(new Error(`unexpected fetch: ${url}`));
      }) as typeof fetch;

      const service = createService({
        OPENROUTER_API_KEY: 'test-key',
        CAMPAIGNS_POLLINATIONS_FALLBACK: 'true',
      });

      const result = await service.generatePosterSync({
        name: 'Test Campaign',
      });

      expect(result.source).toBe('pollinations');
      expect(result.posterUrl).toMatch(/^https:\/\/image\.pollinations\.ai\/prompt\//);
      expect(result.imagePrompt.length).toBeGreaterThan(40);
      expect(callCount).toBeGreaterThanOrEqual(2);
    });

    it('buildPosterPollinations URL is used when no API keys', async () => {
      const imageBytes = Buffer.alloc(12_000, 3);

      global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === 'GET') {
          return Promise.resolve({
            ok: true,
            headers: { get: () => 'image/jpeg' },
            arrayBuffer: async () => imageBytes.buffer,
          });
        }
        return Promise.reject(new Error(`unexpected fetch: ${url}`));
      }) as typeof fetch;

      const service = createService({
        CAMPAIGNS_POLLINATIONS_FALLBACK: 'true',
      });

      const result = await service.generatePosterSync({
        imageDescription: 'blue square minimalist ad',
      });

      expect(result.source).toBe('pollinations');
      expect(result.posterUrl).toContain('image.pollinations.ai');
      expect(result.imagePrompt.length).toBeGreaterThan(40);
    });

    it('uses imagePrompt directly without calling OpenRouter for enrichment', async () => {
      const preset =
        'Minimal pharmacy poster, 15 percent off medicine, clean white layout, bold headline, offer banners, valid until June 30 2026, professional print ad';
      const pngBase64 = Buffer.alloc(12_000, 1).toString('base64');
      const dataUrl = `data:image/png;base64,${pngBase64}`;

      global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
        const body = JSON.parse((init?.body as string) ?? '{}');
        if (body.modalities?.includes('image')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              choices: [{ message: { images: [{ image_url: { url: dataUrl } }] } }],
            }),
          });
        }
        return Promise.reject(new Error('enrichment should be skipped'));
      }) as typeof fetch;

      const service = createService({
        OPENROUTER_API_KEY: 'test-key',
        CAMPAIGNS_POLLINATIONS_FALLBACK: 'false',
      });

      const result = await service.generatePosterSync({ imagePrompt: preset });
      expect(result.imagePrompt).toBe(preset);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('enrichPosterCreativePrompt', () => {
    it('includes offer dates in fallback prompt when API key missing', async () => {
      const service = createService({});
      const prompt = await service.enrichPosterCreativePrompt({
        imageDescription: 'Medicine 15% off minimal poster',
        startAt: '2026-06-01',
        endAt: '2026-06-30',
      });
      expect(prompt).toContain('June 30, 2026');
      expect(prompt.toLowerCase()).toContain('medicine');
    });
  });

  describe('validateDisplayablePosterUrl', () => {
    it('accepts valid data URLs', async () => {
      const service = createService({});
      const b64 = Buffer.alloc(12_000, 4).toString('base64');
      await expect(
        service.validateDisplayablePosterUrl(`data:image/png;base64,${b64}`),
      ).resolves.toBeUndefined();
    });
  });
});
