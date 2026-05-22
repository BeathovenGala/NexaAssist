/**
 * Proves campaign poster generation produces displayable image bytes.
 *
 * Usage (from backend/):
 *   npm run prove:campaign-poster
 *
 * Writes: tmp/prove-poster.png (or .jpg based on content-type)
 * Requires network for Pollinations fallback when no API keys are set.
 */
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { CampaignAiService } from '../src/campaigns/campaign-ai.service';

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

const PROMPT =
  'A single large red circle centered on a plain white background, minimalist, no text, no watermark';

function isPng(buf: Buffer): boolean {
  return buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50;
}

function isJpeg(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8;
}

async function posterUrlToBuffer(posterUrl: string): Promise<{ buffer: Buffer; ext: string }> {
  if (posterUrl.startsWith('data:image/')) {
    const match = posterUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) throw new Error('Invalid data URL');
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    return { buffer: Buffer.from(match[2], 'base64'), ext };
  }

  const res = await fetch(posterUrl, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get('content-type') ?? '';
  const ext = ct.includes('jpeg') || ct.includes('jpg') ? 'jpg' : 'png';
  return { buffer, ext };
}

async function main(): Promise<void> {
  const backendRoot = path.resolve(__dirname, '..');
  loadEnvFile(path.join(backendRoot, '.env'));

  const config = new ConfigService(process.env);
  const service = new CampaignAiService(config);

  console.log('Generating poster with prompt:', PROMPT.slice(0, 80) + '...');
  const start = Date.now();
  const { posterUrl, source } = await service.generatePosterSync({
    imageDescription: PROMPT,
    name: 'Prove Poster Test',
  });
  console.log(`Done in ${Date.now() - start}ms`);
  console.log('Source:', source);
  console.log('posterUrl prefix:', posterUrl.slice(0, 80) + (posterUrl.length > 80 ? '...' : ''));

  if (!posterUrl.trim()) {
    throw new Error('posterUrl is empty');
  }

  const { buffer, ext } = await posterUrlToBuffer(posterUrl);
  if (buffer.length < 10_240) {
    throw new Error(`Image too small: ${buffer.length} bytes (min 10240)`);
  }
  if (!isPng(buffer) && !isJpeg(buffer)) {
    throw new Error('File does not look like PNG or JPEG');
  }

  const outDir = path.join(backendRoot, 'tmp');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `prove-poster.${ext}`);
  fs.writeFileSync(outPath, buffer);

  console.log('\nSUCCESS: displayable poster saved at:');
  console.log(outPath);
  console.log(`Size: ${buffer.length} bytes`);
}

main().catch((err) => {
  console.error('\nFAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
