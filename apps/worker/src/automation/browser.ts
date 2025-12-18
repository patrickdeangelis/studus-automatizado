import { chromium, Browser, BrowserContext, Page } from 'playwright';

export class StudusBrowser {
  private static instance: StudusBrowser;
  private browser: Browser | null = null;

  private constructor() {}

  static getInstance(): StudusBrowser {
    if (!StudusBrowser.instance) {
      StudusBrowser.instance = new StudusBrowser();
    }
    return StudusBrowser.instance;
  }

  async init() {
    if (this.browser) return;
    
    console.log('Launching Browser...');
    this.browser = await chromium.launch({
      headless: process.env.PLAYWRIGHT_HEADLESS !== 'false', // Default true
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Important for Docker
      ]
    });
    console.log('Browser Launched');
  }

  async newContext(): Promise<BrowserContext> {
    if (!this.browser) await this.init();
    return await this.browser!.newContext({
      viewport: { width: 1280, height: 720 },
      locale: 'pt-BR',
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
