import { Browser, chromium } from 'playwright';
import { BrowserContext, Page } from 'playwright';

export interface BrowserConfig {
  headless?: boolean;
  slowMo?: number;
  userAgent?: string;
  viewport?: { width: number; height: number };
}

export class PlaywrightService {
  private browser: Browser | null = null;
  private contexts: Map<string, BrowserContext> = new Map();

  constructor() {}

  async initialize(config: BrowserConfig = {}): Promise<void> {
    if (this.browser) {
      console.log('Browser already initialized');
      return;
    }

    const defaultConfig = {
      headless: process.env.PLAYWRIGHT_HEADLESS === 'true',
      slowMo: parseInt(process.env.PLAYWRIGHT_SLOWMO || '500'),
      userAgent: process.env.PLAYWRIGHT_USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 }
    };

    const finalConfig = { ...defaultConfig, ...config };

    console.log('Initializing Playwright browser...', finalConfig);

    this.browser = await chromium.launch({
      headless: finalConfig.headless,
      slowMo: finalConfig.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    console.log('✅ Browser initialized successfully');
  }

  async createContext(options: any = {}): Promise<BrowserContext> {
    if (!this.browser) {
      await this.initialize();
    }

    const defaultOptions = {
      userAgent: process.env.PLAYWRIGHT_USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      ignoreHTTPSErrors: true,
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
      ...options
    };

    const context = await this.browser!.newContext(defaultOptions);

    // Configurar timeouts padrão
    context.setDefaultTimeout(parseInt(process.env.PLAYWRIGHT_TIMEOUT || '60000'));
    context.setDefaultNavigationTimeout(parseInt(process.env.PLAYWRIGHT_TIMEOUT || '60000'));

    // Gerar ID único para o contexto
    const contextId = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.contexts.set(contextId, context);

    console.log(`✅ Created new context: ${contextId}`);

    return context;
  }

  async createPage(context?: BrowserContext): Promise<Page> {
    let targetContext = context;

    if (!targetContext) {
      targetContext = await this.createContext();
    }

    const page = await targetContext.newPage();

    // Interceptar requisições para logging
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('studus') || url.includes('Studus')) {
        console.log(`🌐 ${request.method()} ${url}`);
      }
    });

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('studus') || url.includes('Studus')) {
        console.log(`📡 ${response.status()} ${url}`);
      }
    });

    // Log de console da página
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('⚠️ Page error:', msg.text());
      }
    });

    // Log de erros da página
    page.on('pageerror', (error) => {
      console.error('❌ Page error:', error.message);
    });

    return page;
  }

  async takeScreenshot(page: Page, filename: string): Promise<string> {
    const screenshotDir = './screenshots';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fullFilename = `${filename}_${timestamp}.png`;
    const filepath = `${screenshotDir}/${fullFilename}`;

    try {
      await page.screenshot({
        path: filepath,
        fullPage: true,
        type: 'png'
      });
      console.log(`📸 Screenshot saved: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('❌ Error taking screenshot:', error);
      throw error;
    }
  }

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async waitForElement(
    page: Page,
    selector: string,
    options: { timeout?: number; state?: 'visible' | 'hidden' } = {}
  ): Promise<void> {
    const { timeout = 30000, state = 'visible' } = options;

    try {
      await page.waitForSelector(selector, { timeout, state });
    } catch (error) {
      throw new Error(`Element not found: ${selector} (state: ${state}, timeout: ${timeout}ms)`);
    }
  }

  async waitForNavigation(
    page: Page,
    options: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' } = {}
  ): Promise<void> {
    const { timeout = 30000, waitUntil = 'networkidle' } = options;

    try {
      await page.waitForNavigation({ timeout, waitUntil });
    } catch (error) {
      console.warn('Navigation timeout, but continuing...');
    }
  }

  async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayBetweenRetries: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Operation failed (attempt ${attempt + 1}/${maxRetries}):`, lastError.message);

        if (attempt < maxRetries - 1) {
          await this.delay(delayBetweenRetries * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    throw lastError!;
  }

  async getContext(contextId: string): Promise<BrowserContext | undefined> {
    return this.contexts.get(contextId);
  }

  async closeContext(contextId: string): Promise<void> {
    const context = this.contexts.get(contextId);
    if (context) {
      await context.close();
      this.contexts.delete(contextId);
      console.log(`✅ Context closed: ${contextId}`);
    }
  }

  async close(): Promise<void> {
    // Fechar todos os contextos
    for (const [id, context] of this.contexts) {
      await context.close();
    }
    this.contexts.clear();

    // Fechar o browser
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('✅ Browser closed');
    }
  }

  isInitialized(): boolean {
    return this.browser !== null;
  }
}