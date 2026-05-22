import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObjectStorageService } from '../common/storage/object-storage.service';
import type { GenerateCopyDto, GeneratePosterDto } from './dto/campaign.dto';

export interface StructuredCampaignCopy {
  headline: string;
  body: string;
  cta: string;
  imagePrompt: string;
}

export type PosterSource = 'openrouter' | 'together' | 'pollinations';

export interface GeneratePosterResult {
  posterUrl: string;
  source: PosterSource;
  /** Detailed ad prompt sent to the image model (from OpenRouter expansion). */
  imagePrompt: string;
}

export type PosterCreativeInput = GeneratePosterDto & {
  name?: string;
  copy?: string;
  imageDescription?: string;
  imagePrompt?: string;
  objective?: string;
  notes?: string;
  startAt?: string;
  endAt?: string;
};

type OpenRouterChatImageResponse = {
  choices?: {
    message?: {
      images?: {
        type?: string;
        image_url?: { url?: string };
        imageUrl?: { url?: string };
      }[];
    };
  }[];
  error?: { message?: string; code?: number };
};

const MIN_POSTER_BYTES = 10_240;
const REMOTE_POSTER_FETCH_TIMEOUT_MS = 90_000;
const POLLINATIONS_VERIFY_ATTEMPTS = 3;
const POLLINATIONS_VERIFY_RETRY_DELAY_MS = 2_000;

@Injectable()
export class CampaignAiService {
  private readonly logger = new Logger(CampaignAiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  private getCampaignModel(): string {
    return (
      this.config.get<string>('CAMPAIGNS_OPENROUTER_MODEL') ??
      this.config.get<string>('OPENROUTER_MODEL') ??
      'deepseek/deepseek-v4-flash:free'
    );
  }

  private getCampaignImageModel(): string {
    return (
      this.config.get<string>('CAMPAIGNS_OPENROUTER_IMAGE_MODEL') ??
      'black-forest-labs/flux.2-klein-4b'
    );
  }

  private getTogetherKey(): string | null {
    const key = this.config.get<string>('TOGETHER_API_KEY');
    return key?.trim() ? key : null;
  }

  private getTogetherImageModel(): string {
    return (
      this.config.get<string>('TOGETHER_IMAGE_MODEL') ??
      'black-forest-labs/FLUX.1-schnell-Free'
    );
  }

  private allowPollinationsFallback(): boolean {
    return this.config.get<string>('CAMPAIGNS_POLLINATIONS_FALLBACK') !== 'false';
  }

  posterUrlKind(url: string): 'data-url' | 'https' {
    return url.startsWith('data:') ? 'data-url' : 'https';
  }

  private logPosterSuccess(
    source: PosterSource,
    posterUrl: string,
    imagePrompt: string,
    model?: string,
  ): void {
    this.logger.log({
      provider: source,
      model,
      promptLength: imagePrompt.length,
      posterUrlKind: this.posterUrlKind(posterUrl),
    });
  }

  extractOpenRouterImageUrl(data: OpenRouterChatImageResponse): string | null {
    const images = data.choices?.[0]?.message?.images;
    if (!images?.length) return null;
    for (const image of images) {
      const url = image.image_url?.url ?? image.imageUrl?.url;
      if (url?.trim()) return url.trim();
    }
    return null;
  }

  async validateDisplayablePosterUrl(posterUrl: string): Promise<void> {
    if (posterUrl.startsWith('data:image/')) {
      const base64 = posterUrl.split(',')[1];
      if (!base64 || Buffer.from(base64, 'base64').length < MIN_POSTER_BYTES) {
        throw new Error('Data URL poster is too small or invalid');
      }
      return;
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= POLLINATIONS_VERIFY_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REMOTE_POSTER_FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(posterUrl, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'follow',
          headers: { Accept: 'image/*' },
        });
        if (!res.ok) {
          throw new Error(`Poster URL returned HTTP ${res.status}`);
        }
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < MIN_POSTER_BYTES) {
          throw new Error(`Poster download too small (${buf.length} bytes)`);
        }
        const contentType = res.headers.get('content-type') ?? '';
        const looksLikeImage =
          contentType.includes('image') ||
          (buf[0] === 0x89 && buf[1] === 0x50) ||
          (buf[0] === 0xff && buf[1] === 0xd8);
        if (!looksLikeImage) {
          throw new Error(`Poster response is not an image (${contentType || 'unknown'})`);
        }
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < POLLINATIONS_VERIFY_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, POLLINATIONS_VERIFY_RETRY_DELAY_MS));
        }
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError ?? new Error('Poster URL validation failed');
  }

  private fallbackCopy(
    dto: GenerateCopyDto & { name?: string; objective?: string; audienceType?: string },
  ): string {
    const name = dto.name ?? 'Our Campaign';
    const objective = dto.objective?.replace(/_/g, ' ').toLowerCase() ?? 'brand awareness';
    const audience = dto.audienceType?.replace(/_/g, ' ').toLowerCase() ?? 'valued customers';
    const tone = dto.tone ?? 'engaging';
    const context = dto.additionalContext ?? dto.targetAudience ?? '';

    const subject = `${name} — ${objective.replace(/\b\w/g, (c) => c.toUpperCase())}`;
    const body = [
      context.trim()
        ? `${context.trim()}`
        : `Discover what ${name} has to offer.`,
      ``,
      `This message is crafted for ${audience} with a ${tone} tone.`,
      ``,
      `Take action today and experience the difference.`,
    ].join('\n');

    return `${subject}\n\n${body}`;
  }

  private fallbackStructuredCopy(
    dto: GenerateCopyDto & { name?: string; objective?: string; audienceType?: string },
  ): StructuredCampaignCopy {
    const name = dto.name ?? 'Our Campaign';
    const objective = dto.objective?.replace(/_/g, ' ').toLowerCase() ?? 'brand awareness';
    const audience = dto.audienceType?.replace(/_/g, ' ').toLowerCase() ?? 'valued customers';
    const context = dto.additionalContext ?? dto.targetAudience ?? '';

    return {
      headline: `${name} — ${objective.replace(/\b\w/g, (c) => c.toUpperCase())}`,
      body: [
        context.trim() || `Discover what ${name} has to offer.`,
        `Crafted for ${audience} with a ${dto.tone ?? 'engaging'} tone.`,
      ].join(' '),
      cta: 'Learn More',
      imagePrompt: [
        `Professional marketing poster for "${name}".`,
        `Theme: ${objective}.`,
        `Style: modern, clean, vibrant commercial advertisement.`,
        `No text overlays.`,
      ].join(' '),
    };
  }

  async generateStructuredCopy(
    dto: GenerateCopyDto & { name?: string; objective?: string; audienceType?: string },
  ): Promise<StructuredCampaignCopy> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    if (!apiKey?.trim()) {
      this.logger.warn('OPENROUTER_API_KEY not configured, returning template structured copy');
      return this.fallbackStructuredCopy(dto);
    }

    const model = this.getCampaignModel();
    const prompt = [
      `You are a professional marketing copywriter and visual creative director.`,
      `Create campaign assets for:`,
      dto.name ? `Campaign name: ${dto.name}` : '',
      dto.objective ? `Objective: ${dto.objective.replace(/_/g, ' ')}` : '',
      dto.audienceType ? `Target audience: ${dto.audienceType.replace(/_/g, ' ')}` : '',
      dto.targetAudience ? `Audience details: ${dto.targetAudience}` : '',
      dto.tone ? `Tone: ${dto.tone}` : 'Tone: professional and engaging',
      dto.additionalContext ? `Additional context: ${dto.additionalContext}` : '',
      ``,
      `Return ONLY valid JSON with these exact keys:`,
      `{`,
      `  "headline": "punchy headline max 10 words",`,
      `  "body": "persuasive body copy max 150 words",`,
      `  "cta": "short call-to-action phrase max 5 words",`,
      `  "imagePrompt": "detailed visual description for an image generation model: scene, style, colors, mood, industry context. No text overlays in the image."`,
      `}`,
    ]
      .filter(Boolean)
      .join('\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3000',
          'X-Title': 'NexaAssist Campaigns',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 768,
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`OpenRouter structured copy error ${res.status}: ${text.slice(0, 200)}`);
        return this.fallbackStructuredCopy(dto);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string | null } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return this.fallbackStructuredCopy(dto);
      }

      const parsed = JSON.parse(content) as Partial<StructuredCampaignCopy>;
      const headline = parsed.headline?.trim();
      const body = parsed.body?.trim();
      const cta = parsed.cta?.trim();
      const imagePrompt = parsed.imagePrompt?.trim();

      if (!headline || !body || !cta || !imagePrompt) {
        this.logger.warn('Incomplete structured copy from LLM, using template fallback');
        return this.fallbackStructuredCopy(dto);
      }

      return { headline, body, cta, imagePrompt };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Structured copy gen failed (${msg}), using template fallback`);
      return this.fallbackStructuredCopy(dto);
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateCopySync(
    dto: GenerateCopyDto & { name?: string; objective?: string; audienceType?: string },
  ): Promise<string> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    if (!apiKey?.trim()) {
      this.logger.warn('OPENROUTER_API_KEY not configured, returning template copy');
      return this.fallbackCopy(dto);
    }

    const model = this.getCampaignModel();

    const prompt = [
      `You are a professional marketing copywriter.`,
      `Write compelling marketing copy for a campaign with these details:`,
      dto.name ? `Campaign name: ${dto.name}` : '',
      dto.objective ? `Objective: ${dto.objective.replace(/_/g, ' ')}` : '',
      dto.audienceType ? `Target audience: ${dto.audienceType.replace(/_/g, ' ')}` : '',
      dto.targetAudience ? `Audience details: ${dto.targetAudience}` : '',
      dto.tone ? `Tone: ${dto.tone}` : 'Tone: professional and engaging',
      dto.additionalContext ? `Additional context: ${dto.additionalContext}` : '',
      ``,
      `Write a complete marketing message (subject line + body text) that is persuasive, clear, and action-oriented.`,
      `Format: Start with a punchy subject line on the first line, then a blank line, then the body copy.`,
      `Keep it under 200 words. Do not include any meta-commentary, just the copy itself.`,
    ]
      .filter(Boolean)
      .join('\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3000',
          'X-Title': 'NexaAssist Campaigns',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 512,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`OpenRouter copy gen error ${res.status}: ${text.slice(0, 200)}`);
        return this.fallbackCopy(dto);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string | null } }[];
      };
      const copy = data.choices?.[0]?.message?.content;
      if (!copy) {
        this.logger.warn('Empty response from OpenRouter for copy gen, using template fallback');
        return this.fallbackCopy(dto);
      }
      return copy.trim();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Copy gen failed (${msg}), using template fallback`);
      return this.fallbackCopy(dto);
    } finally {
      clearTimeout(timeout);
    }
  }

  private formatOfferDateRange(startAt?: string, endAt?: string): string | null {
    const format = (iso: string) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    };

    const start = startAt ? format(startAt) : null;
    const end = endAt ? format(endAt) : null;

    if (start && end) return `${start} – ${end}`;
    if (end) return `Valid until ${end}`;
    if (start) return `Starts ${start}`;
    return null;
  }

  private fallbackEnrichedPosterPrompt(dto: PosterCreativeInput): string {
    const brief = dto.imageDescription?.trim() ?? dto.notes?.trim() ?? '';
    const offerDates = this.formatOfferDateRange(dto.startAt, dto.endAt);
    const copySnippet = dto.copy?.slice(0, 160).replace(/\n/g, ' ').trim();

    return [
      `Professional marketing poster advertisement, print-quality composition.`,
      dto.name ? `Campaign: "${dto.name}".` : '',
      dto.objective
        ? `Objective: ${dto.objective.replace(/_/g, ' ').toLowerCase()}.`
        : '',
      brief ? `Creative direction from client brief: ${brief}.` : '',
      copySnippet ? `Messaging theme: ${copySnippet}.` : '',
      offerDates
        ? `Include clearly readable offer validity text on the poster: "${offerDates}".`
        : `Include bold promotional headline, discount callout, decorative banners, and a "Limited Time Offer" urgency line (no invented calendar dates).`,
      `Layout: clean minimal design with headline zone, offer badge, supporting product or lifestyle imagery, balanced whitespace.`,
      `Typography: modern sans-serif, high contrast, legible marketing text integrated into the design.`,
      `Color: vibrant commercial palette, polished and trustworthy.`,
      `No watermarks, no distorted anatomy, no surreal elements.`,
    ]
      .filter(Boolean)
      .join(' ');
  }

  async enrichPosterCreativePrompt(dto: PosterCreativeInput): Promise<string> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    if (!apiKey?.trim()) {
      this.logger.warn(
        'OPENROUTER_API_KEY not configured, using template poster creative prompt',
      );
      return this.fallbackEnrichedPosterPrompt(dto);
    }

    const offerDates = this.formatOfferDateRange(dto.startAt, dto.endAt);
    const userBrief =
      dto.imageDescription?.trim() ||
      dto.notes?.trim() ||
      dto.copy?.slice(0, 200).replace(/\n/g, ' ').trim() ||
      '';

    const model = this.getCampaignModel();
    const prompt = [
      `You are an expert advertising creative director and AI image prompt engineer.`,
      `Turn the client's rough brief into ONE detailed image-generation prompt for a marketing poster.`,
      ``,
      userBrief ? `Client brief (fix typos, interpret intent): ${userBrief}` : '',
      dto.name ? `Campaign name: ${dto.name}` : '',
      dto.objective ? `Objective: ${dto.objective.replace(/_/g, ' ')}` : '',
      dto.copy ? `Marketing copy context: ${dto.copy.slice(0, 300).replace(/\n/g, ' ')}` : '',
      offerDates
        ? `Offer validity dates (MUST appear as readable text on the poster): ${offerDates}`
        : `No specific offer dates were provided. Still design a complete promotional poster with headline, discount/offer callout, banners, and a "Limited Time Offer" line — do not invent specific calendar dates.`,
      ``,
      `Requirements for your output prompt:`,
      `- 150–280 words, single paragraph, English only`,
      `- Describe layout, colors, imagery, typography areas, and text elements (headline, discount %, banners)`,
      `- If the brief asks for minimal/clean style, honor that`,
      `- Specify professional print-ad quality; avoid watermarks and distorted faces/hands`,
      `- Return ONLY the image prompt text — no JSON, labels, or commentary`,
    ]
      .filter(Boolean)
      .join('\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3000',
          'X-Title': 'NexaAssist Campaigns',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 600,
          temperature: 0.65,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(
          `OpenRouter poster creative prompt error ${res.status}: ${text.slice(0, 200)}`,
        );
        return this.fallbackEnrichedPosterPrompt(dto);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string | null } }[];
      };
      const enriched = data.choices?.[0]?.message?.content?.trim();
      if (!enriched || enriched.length < 80) {
        this.logger.warn('Empty or short poster creative prompt from LLM, using template');
        return this.fallbackEnrichedPosterPrompt(dto);
      }

      return enriched;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Poster creative enrichment failed (${msg}), using template`);
      return this.fallbackEnrichedPosterPrompt(dto);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async resolvePosterImagePrompt(dto: PosterCreativeInput): Promise<string> {
    const preset = dto.imagePrompt?.trim();
    if (preset && preset.length >= 40) {
      return preset;
    }

    const hasCreativeInput =
      !!dto.imageDescription?.trim() ||
      !!dto.notes?.trim() ||
      !!dto.name?.trim();

    if (!hasCreativeInput) {
      return this.fallbackEnrichedPosterPrompt(dto);
    }

    return this.enrichPosterCreativePrompt(dto);
  }

  private async generatePosterOpenRouter(imagePrompt: string): Promise<string> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    if (!apiKey?.trim()) throw new Error('OpenRouter API key not configured');

    const model = this.getCampaignImageModel();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3000',
          'X-Title': 'NexaAssist Campaigns',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: imagePrompt }],
          modalities: ['image'],
        }),
        signal: controller.signal,
      });

      const data = (await res.json()) as OpenRouterChatImageResponse;

      if (!res.ok) {
        const msg = data.error?.message ?? `HTTP ${res.status}`;
        throw new Error(`OpenRouter image: ${msg}`);
      }

      const url = this.extractOpenRouterImageUrl(data);
      if (!url) throw new Error('OpenRouter image: no images in response');
      return url;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async generatePosterTogether(imagePrompt: string): Promise<string> {
    const apiKey = this.getTogetherKey();
    if (!apiKey) throw new Error('Together API key not configured');

    const model = this.getTogetherImageModel();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const res = await fetch('https://api.together.xyz/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: imagePrompt,
          width: 1024,
          height: 1024,
          n: 1,
          response_format: 'b64_json',
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Together image: ${res.status} ${text.slice(0, 120)}`);
      }

      const data = (await res.json()) as {
        data?: { b64_json?: string; url?: string }[];
      };

      const item = data.data?.[0];
      if (!item) throw new Error('Together image: empty response');
      if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
      if (item.url) return item.url;
      throw new Error('Together image: no usable image data');
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildPosterPollinationsUrl(imagePrompt: string): string {
    const encoded = encodeURIComponent(imagePrompt.slice(0, 400));
    const seed = Date.now();
    return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
  }

  private async generatePosterPollinations(imagePrompt: string): Promise<string> {
    const url = this.buildPosterPollinationsUrl(imagePrompt);
    await this.validateDisplayablePosterUrl(url);
    return url;
  }

  private async finalizePosterUrl(posterUrl: string): Promise<string> {
    if (!this.objectStorage.isConfigured()) {
      return posterUrl;
    }
    try {
      return await this.objectStorage.persistPosterUrl(posterUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Object storage upload failed, using source URL: ${msg}`);
      return posterUrl;
    }
  }

  async generatePosterSync(dto: PosterCreativeInput): Promise<GeneratePosterResult> {
    const imagePrompt = await this.resolvePosterImagePrompt(dto);
    const errors: string[] = [];

    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    if (apiKey?.trim()) {
      try {
        const rawUrl = await this.generatePosterOpenRouter(imagePrompt);
        const posterUrl = await this.finalizePosterUrl(rawUrl);
        await this.validateDisplayablePosterUrl(posterUrl);
        this.logPosterSuccess('openrouter', posterUrl, imagePrompt, this.getCampaignImageModel());
        return { posterUrl, source: 'openrouter', imagePrompt };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(msg);
        this.logger.warn(`OpenRouter poster failed: ${msg}`);
      }
    } else {
      errors.push('OpenRouter API key not configured');
    }

    if (this.getTogetherKey()) {
      try {
        const rawUrl = await this.generatePosterTogether(imagePrompt);
        const posterUrl = await this.finalizePosterUrl(rawUrl);
        await this.validateDisplayablePosterUrl(posterUrl);
        this.logPosterSuccess('together', posterUrl, imagePrompt, this.getTogetherImageModel());
        return { posterUrl, source: 'together', imagePrompt };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(msg);
        this.logger.warn(`Together poster failed: ${msg}`);
      }
    }

    if (this.allowPollinationsFallback()) {
      try {
        this.logger.warn(
          'Using Pollinations fallback for campaign poster (set CAMPAIGNS_POLLINATIONS_FALLBACK=false to disable)',
        );
        const rawUrl = await this.generatePosterPollinations(imagePrompt);
        const posterUrl = await this.finalizePosterUrl(rawUrl);
        this.logPosterSuccess('pollinations', posterUrl, imagePrompt);
        return { posterUrl, source: 'pollinations', imagePrompt };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Pollinations: ${msg}`);
        this.logger.warn(`Pollinations poster failed: ${msg}`);
      }
    }

    throw new ServiceUnavailableException(
      `Image generation failed. Add OpenRouter credits for model ${this.getCampaignImageModel()}, ` +
        `or set a valid TOGETHER_API_KEY. Details: ${errors.join('; ')}`,
    );
  }

  async quickGenerate(dto: {
    prompt: string;
    name?: string;
    objective?: string;
    audienceType?: string;
  }): Promise<{
    headline: string;
    body: string;
    cta: string;
    imagePrompt: string;
    posterUrl: string;
    source: PosterSource;
  }> {
    const structured = await this.generateStructuredCopy({
      name: dto.name,
      objective: dto.objective,
      audienceType: dto.audienceType,
      additionalContext: dto.prompt,
      tone: 'engaging and friendly',
    });

    const { posterUrl, source, imagePrompt } = await this.generatePosterSync({
      name: dto.name,
      objective: dto.objective,
      imageDescription: dto.prompt,
    });

    return {
      headline: structured.headline,
      body: structured.body,
      cta: structured.cta,
      imagePrompt,
      posterUrl,
      source,
    };
  }
}
