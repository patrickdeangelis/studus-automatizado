/**
 * Studus Authentication Service
 * Valida credenciais diretamente no portal Studus
 */
import { Browser, BrowserContext, Page } from 'playwright';
import { Redis } from 'ioredis';

interface ValidationResult {
  success: boolean;
  error?: string;
  cookies?: any[];
  userInfo?: {
    name: string;
    email?: string;
  };
}

class StudusAuthService {
  private redis: Redis;
  private cache: Map<string, { result: ValidationResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutos
  private readonly MAX_ATTEMPTS = 5;

  constructor() {
    // Conectar ao Redis para cache distribuído
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    // Limpar cache expirado periodicamente
    setInterval(() => this.cleanupCache(), 60 * 1000);
  }

  /**
   * Valida credenciais do Studus
   * @param username Usuário do Studus
   * @param password Senha do Studus
   * @returns Resultado da validação
   */
  async validateCredentials(username: string, password: string): Promise<ValidationResult> {
    const cacheKey = `studus_auth:${username}`;
    const now = Date.now();

    // Verificar rate limiting
    const rateLimitKey = `rate_limit:${username}`;
    const attempts = await this.redis.incr(rateLimitKey);
    if (attempts === 1) {
      await this.redis.expire(rateLimitKey, this.RATE_LIMIT_WINDOW / 1000);
    }

    if (attempts > this.MAX_ATTEMPTS) {
      const ttl = await this.redis.ttl(rateLimitKey);
      return {
        success: false,
        error: `Muitas tentativas. Tente novamente em ${Math.ceil(ttl / 60)} minutos.`
      };
    }

    // Verificar cache local
    const cached = this.cache.get(cacheKey);
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      return cached.result;
    }

    // Verificar cache Redis
    try {
      const redisCached = await this.redis.get(cacheKey);
      if (redisCached) {
        const parsed = JSON.parse(redisCached);
        this.cache.set(cacheKey, { result: parsed, timestamp: now });
        return parsed;
      }
    } catch (error) {
      console.error('Redis cache error:', error);
    }

    // Fazer validação real no Studus
    const result = await this.performValidation(username, password);

    // Salvar no cache
    try {
      await this.redis.setex(cacheKey, this.CACHE_TTL / 1000, JSON.stringify(result));
    } catch (error) {
      console.error('Redis cache save error:', error);
    }
    this.cache.set(cacheKey, { result, timestamp: now });

    // Reset rate limit em sucesso
    if (result.success) {
      await this.redis.del(rateLimitKey);
    }

    return result;
  }

  /**
   * Realiza validação no portal Studus usando Playwright
   */
  private async performValidation(username: string, password: string): Promise<ValidationResult> {
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      // Iniciar browser em modo headless
      const { chromium } = await import('playwright');
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      page = await context.newPage();

      // Ir para página de login
      await page.goto('https://www.studus.com.br/StudusFIP/login.xhtml', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Preencher credenciais
      await page.fill('#j_username', username);
      await page.fill('#j_password', password);

      // Clicar no botão de login
      await Promise.all([
        page.waitForNavigation({ url: '**/StudusFIP/**', waitUntil: 'networkidle' }),
        page.click('button[type="submit"], button:has-text("Acessar")')
      ]);

      // Verificar se houve redirecionamento para área logada
      const url = page.url();
      if (url.includes('StudusFIP') && !url.includes('login.xhtml')) {
        // Lidar com popup "Não, obrigado" se aparecer
        try {
          await page.waitForSelector('button:has-text("Não, obrigado")', { timeout: 5000 });
          await page.click('button:has-text("Não, obrigado")');
          await page.waitForTimeout(1000);
        } catch (e) {
          // Popup não apareceu, tudo bem
        }

        // Capturar cookies
        const cookies = await context.cookies();

        // Tentar extrair informações do usuário
        let userInfo = undefined;
        try {
          await page.goto('https://www.studus.com.br/StudusFIP/pages/inicial.jsf', { waitUntil: 'networkidle' });

          // Procurar nome do usuário na página
          const nameElement = await page.$('.user-info, .usuario, [class*="nome"], [class*="user"]');
          if (nameElement) {
            const nameText = await nameElement.textContent();
            if (nameText && nameText.trim()) {
              userInfo = { name: nameText.trim() };
            }
          }
        } catch (e) {
          // Não conseguiu extrair informações, mas login foi bem-sucedido
        }

        return {
          success: true,
          cookies,
          userInfo
        };
      } else {
        return {
          success: false,
          error: 'Credenciais inválidas'
        };
      }
    } catch (error) {
      console.error('Studus validation error:', error);
      return {
        success: false,
        error: 'Erro ao validar credenciais no Studus'
      };
    } finally {
      // Limpar recursos
      if (page) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();
    }
  }

  /**
   * Verifica se uma sessão ainda está válida
   * @param cookies Cookies da sessão
   * @returns true se a sessão for válida
   */
  async validateSession(cookies: any[]): Promise<boolean> {
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      const { chromium } = await import('playwright');
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      context = await browser.newContext();

      // Adicionar cookies ao contexto
      await context.addCookies(cookies);

      page = await context.newPage();

      // Tentar acessar área restrita
      const response = await page.goto('https://www.studus.com.br/StudusFIP/pages/inicial.jsf', {
        waitUntil: 'networkidle',
        timeout: 15000
      });

      // Se não redirecionar para login, sessão é válida
      return response && !response.url().includes('login.xhtml');
    } catch (error) {
      return false;
    } finally {
      if (page) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();
    }
  }

  /**
   * Limpa cache expirado
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpa cache para um usuário específico
   */
  async clearUserCache(username: string): Promise<void> {
    const cacheKey = `studus_auth:${username}`;
    this.cache.delete(cacheKey);
    try {
      await this.redis.del(cacheKey);
    } catch (error) {
      console.error('Error clearing user cache:', error);
    }
  }

  /**
   * Limpa todos os caches
   */
  async clearAllCache(): Promise<void> {
    this.cache.clear();
    try {
      const keys = await this.redis.keys('studus_auth:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Error clearing all caches:', error);
    }
  }
}

// Singleton instance
export const studusAuthService = new StudusAuthService();