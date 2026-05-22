import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'NEXASSIST-PLATFORM-REPORT.html');
const pdfPath = path.join(__dirname, 'NEXASSIST-PLATFORM-REPORT.pdf');
const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(fileUrl, { waitUntil: 'networkidle' });
await page.waitForSelector('.mermaid svg', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(2000);
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '14mm', right: '12mm', bottom: '14mm', left: '12mm' },
});
await browser.close();
console.log('PDF written to:', pdfPath);
