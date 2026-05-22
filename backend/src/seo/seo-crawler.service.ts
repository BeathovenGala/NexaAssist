import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import * as http from 'http';
import { normalizeAuditUrl } from './seo-url.util';

export interface CrawledPage {
  url: string;
  statusCode: number;
  title: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  h1: string | null;
  h1s: string[];
  h2s: string[];
  bodyText: string | null;
  wordCount: number;
  links: string[];
  internalLinkCount: number;
  externalLinkCount: number;
  totalImages: number;
  missingAltCount: number;
  hasSchemaMarkup: boolean;
  loadTimeMs: number;
}

const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 12_000;

@Injectable()
export class SeoCrawlerService {
  private readonly logger = new Logger(SeoCrawlerService.name);

  async crawlPage(url: string): Promise<CrawledPage> {
    const normalizedUrl = normalizeAuditUrl(url);
    const start = Date.now();
    let html = '';
    let statusCode = 200;
    let finalUrl = normalizedUrl;

    try {
      const result = await this.fetchUrl(normalizedUrl);
      html = result.body;
      statusCode = result.statusCode;
      finalUrl = result.finalUrl;
    } catch (err) {
      this.logger.warn({ url, err }, 'Failed to fetch page');
      statusCode = 0;
    }

    const loadTimeMs = Date.now() - start;

    if (!html) {
      return {
        url: finalUrl,
        statusCode,
        title: null,
        metaDescription: null,
        metaKeywords: null,
        canonicalUrl: null,
        ogTitle: null,
        ogDescription: null,
        h1: null,
        h1s: [],
        h2s: [],
        bodyText: null,
        wordCount: 0,
        links: [],
        internalLinkCount: 0,
        externalLinkCount: 0,
        totalImages: 0,
        missingAltCount: 0,
        hasSchemaMarkup: false,
        loadTimeMs,
      };
    }

    const title = this.extractTitle(html);
    const metaDescription = this.extractMetaContent(html, 'description');
    const metaKeywords = this.extractMetaContent(html, 'keywords');
    const canonicalUrl = this.extractCanonical(html);
    const ogTitle = this.extractOgProperty(html, 'og:title');
    const ogDescription = this.extractOgProperty(html, 'og:description');
    const h1s = this.extractAllHeadingTexts(html, 'h1');
    const h1 = h1s[0] ?? null;
    const h2s = this.extractAllHeadingTexts(html, 'h2');
    const { totalImages, missingAltCount } = this.extractAltTagMetrics(html);
    const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = plainText.split(' ').filter((w) => w.length > 0).length;
    const bodyText = plainText.slice(0, 1000) || null;
    const links = this.extractLinks(html, finalUrl);
    const hasSchemaMarkup =
      html.includes('application/ld+json') ||
      html.includes('itemtype=') ||
      html.includes('itemscope');

    let internalLinkCount = 0;
    let externalLinkCount = 0;
    try {
      const baseHostname = new URL(finalUrl).hostname;
      for (const link of links) {
        try {
          if (new URL(link).hostname === baseHostname) internalLinkCount++;
          else externalLinkCount++;
        } catch {
          // skip invalid
        }
      }
    } catch {
      // skip
    }

    return {
      url: finalUrl,
      statusCode,
      title,
      metaDescription,
      metaKeywords,
      canonicalUrl,
      ogTitle,
      ogDescription,
      h1,
      h1s,
      h2s,
      bodyText,
      wordCount,
      links,
      internalLinkCount,
      externalLinkCount,
      totalImages,
      missingAltCount,
      hasSchemaMarkup,
      loadTimeMs,
    };
  }

  async discoverLinks(baseUrl: string, maxDepth = 2): Promise<string[]> {
    const visited = new Set<string>();
    const toVisit: Array<{ url: string; depth: number }> = [{ url: baseUrl, depth: 0 }];
    const discovered: string[] = [];

    while (toVisit.length > 0 && discovered.length < 50) {
      const item = toVisit.shift();
      if (!item || visited.has(item.url)) continue;
      visited.add(item.url);
      discovered.push(item.url);

      if (item.depth < maxDepth) {
        try {
          const page = await this.crawlPage(item.url);
          const internalLinks = page.links.filter(
            (l) => l.startsWith(baseUrl) && !visited.has(l),
          );
          for (const link of internalLinks.slice(0, 10)) {
            toVisit.push({ url: link, depth: item.depth + 1 });
          }
        } catch {
          // Skip failed pages
        }
      }
    }

    return discovered;
  }

  private fetchUrl(
    url: string,
    redirectCount = 0,
  ): Promise<{ body: string; statusCode: number; finalUrl: string }> {
    return new Promise((resolve, reject) => {
      if (redirectCount > MAX_REDIRECTS) {
        return reject(new Error(`Too many redirects (>${MAX_REDIRECTS}) for ${url}`));
      }

      const client = url.startsWith('https') ? https : http;
      const timeout = setTimeout(() => reject(new Error('Timeout')), FETCH_TIMEOUT_MS);

      client
        .get(
          url,
          { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NexaAssist-SEO-Bot/1.0)' } },
          (res) => {
            const status = res.statusCode ?? 0;

            // Follow 3xx redirects
            if (status >= 301 && status <= 308 && res.headers.location) {
              clearTimeout(timeout);
              res.resume(); // consume and discard the response body
              let redirectUrl = res.headers.location;
              // Resolve relative redirect URLs
              try {
                redirectUrl = new URL(redirectUrl, url).toString();
              } catch {
                return reject(new Error(`Invalid redirect location: ${redirectUrl}`));
              }
              this.fetchUrl(redirectUrl, redirectCount + 1)
                .then(resolve)
                .catch(reject);
              return;
            }

            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => {
              clearTimeout(timeout);
              resolve({
                body: Buffer.concat(chunks).toString('utf-8'),
                statusCode: status,
                finalUrl: url,
              });
            });
            res.on('error', (err) => {
              clearTimeout(timeout);
              reject(err);
            });
          },
        )
        .on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
    });
  }

  /** Extract the text content of the first matching heading tag, stripping any inner HTML. */
  private extractHeadingText(html: string, tag: 'h1' | 'h2'): string | null {
    const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    if (!match?.[1]) return null;
    const text = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text || null;
  }

  /** Extract all heading texts for a tag, stripping inner HTML. */
  private extractAllHeadingTexts(html: string, tag: 'h1' | 'h2'): string[] {
    const results: string[] = [];
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      if (!match[1]) continue;
      const text = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text) results.push(text);
    }
    return results;
  }

  private extractTitle(html: string): string | null {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!match?.[1]) return null;
    const text = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text || null;
  }

  private extractMetaContent(html: string, name: string): string | null {
    const regex = new RegExp(
      `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`,
      'i',
    );
    const altRegex = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`,
      'i',
    );
    return (
      (html.match(regex)?.[1]?.trim() ?? null) ||
      (html.match(altRegex)?.[1]?.trim() ?? null)
    );
  }

  private extractCanonical(html: string): string | null {
    const match =
      html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ??
      html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
    return match?.[1]?.trim() ?? null;
  }

  private extractOgProperty(html: string, property: string): string | null {
    const regex = new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      'i',
    );
    const altRegex = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      'i',
    );
    return (
      (html.match(regex)?.[1]?.trim() ?? null) ||
      (html.match(altRegex)?.[1]?.trim() ?? null)
    );
  }

  private extractAltTagMetrics(html: string): { totalImages: number; missingAltCount: number } {
    const imgRegex = /<img\b[^>]*>/gi;
    let totalImages = 0;
    let missingAltCount = 0;
    let match: RegExpExecArray | null;

    while ((match = imgRegex.exec(html)) !== null) {
      const tag = match[0];
      totalImages++;
      const altMatch = tag.match(/\balt\s*=\s*(["'])(.*?)\1/i);
      if (!altMatch || !altMatch[2].trim()) {
        missingAltCount++;
      }
    }

    return { totalImages, missingAltCount };
  }

  private extractLinks(html: string, baseUrl: string): string[] {
    const links: string[] = [];
    const regex = /<a[^>]+href=["']([^"'#?]+)["']/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(html)) !== null) {
      const href = match[1];
      if (!href) continue;

      try {
        const absolute = href.startsWith('http')
          ? href
          : new URL(href, baseUrl).toString();
        const parsed = new URL(absolute);
        if (parsed.hostname === new URL(baseUrl).hostname) {
          links.push(absolute.split('?')[0].split('#')[0]);
        }
      } catch {
        // Skip invalid URLs
      }
    }

    return [...new Set(links)];
  }
}
