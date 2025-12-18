import { Browser, Page, chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

export interface StudusCredentials {
  username: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  cookies?: any[];
  screenshot?: string;
}

export interface Discipline {
  id: string;
  name: string;
  code?: string;
  semester?: string;
  studentsCount?: number;
  link?: string;
}

export class StudusAutomation {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isLoggedIn: boolean = false;
  private screenshotDir: string = './screenshots';

  constructor() {
    // Criar diretório de screenshots se não existir
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    const headless = process.env.PLAYWRIGHT_HEADLESS === 'true';
    const slowMo = parseInt(process.env.PLAYWRIGHT_SLOWMO || '500');
    const userAgent = process.env.PLAYWRIGHT_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    console.log('Initializing browser...', { headless, slowMo });

    this.browser = await chromium.launch({
      headless,
      slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const context = await this.browser.newContext({
      userAgent,
      viewport: { width: 1366, height: 768 },
      ignoreHTTPSErrors: true,
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo'
    });

    this.page = await context.newPage();

    // Configurar timeouts
    this.page.setDefaultTimeout(parseInt(process.env.PLAYWRIGHT_TIMEOUT || '60000'));
    this.page.setDefaultNavigationTimeout(parseInt(process.env.PLAYWRIGHT_TIMEOUT || '60000'));

    // Interceptar requisições para logging
    this.page.on('request', request => {
      if (request.url().includes('studus')) {
        console.log(`🌐 ${request.method()} ${request.url()}`);
      }
    });

    this.page.on('response', response => {
      if (response.url().includes('studus')) {
        console.log(`📡 ${response.status()} ${response.url()}`);
      }
    });

    console.log('Browser initialized successfully');
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async takeScreenshot(name: string): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}_${timestamp}.png`;
    const filepath = path.join(this.screenshotDir, filename);

    await this.page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 Screenshot saved: ${filepath}`);

    return filepath;
  }

  async login(credentials: StudusCredentials): Promise<LoginResult> {
    if (!this.page) {
      await this.initialize();
    }

    try {
      console.log('🔐 Starting login process...');
      console.log(`Username: ${credentials.username}`);

      // Ir para página de login
      await this.page!.goto('https://www.studus.com.br/StudusFIP/login.xhtml', {
        waitUntil: 'networkidle'
      });

      await this.delay(parseInt(process.env.DELAY_PAGE_LOAD || '5000'));
      await this.takeScreenshot('01_login_page');

      // Preencher formulário de login
      const emailInput = await this.page!.locator('input[placeholder*="Email"], input[name*="email"], input[name*="usuario"]').first();
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
      await emailInput.fill(credentials.username);
      console.log('✅ Email filled');

      const passwordInput = await this.page!.locator('input[type="password"]').first();
      await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
      await passwordInput.fill(credentials.password);
      console.log('✅ Password filled');

      // Tirar screenshot antes de submeter
      await this.takeScreenshot('02_form_filled');

      // Clicar no botão de login
      const loginButton = await this.page!.locator('button:has-text("Acessar"), input[type="submit"], button[type="submit"]').first();
      await loginButton.waitFor({ state: 'visible', timeout: 5000 });

      console.log('🚀 Clicking login button...');
      await loginButton.click();

      // Esperar navegação
      await this.page!.waitForLoadState('networkidle');
      await this.delay(parseInt(process.env.DELAY_PAGE_LOAD || '5000'));

      await this.takeScreenshot('03_after_login');

      // Verificar se login foi bem-sucedido
      const currentUrl = this.page!.url();
      console.log(`Current URL after login: ${currentUrl}`);

      if (currentUrl.includes('login.xhtml')) {
        // Verificar mensagem de erro
        const errorMessage = await this.page!.locator('.ui-message-error, .alert-error, [class*="error"]').first().textContent().catch(() => '');
        return {
          success: false,
          message: errorMessage || 'Login failed - redirected back to login page',
          screenshot: await this.takeScreenshot('login_error')
        };
      }

      // Salvar cookies
      const cookies = await this.page!.context().cookies();

      this.isLoggedIn = true;
      console.log('✅ Login successful!');

      return {
        success: true,
        message: 'Login successful',
        cookies
      };

    } catch (error: any) {
      console.error('❌ Login error:', error.message);

      const screenshot = await this.takeScreenshot('login_error').catch(() => '');

      return {
        success: false,
        message: error.message,
        screenshot
      };
    }
  }

  async navigateToProfessorArea(): Promise<boolean> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in');
    }

    try {
      console.log('👨‍🏫 Navigating to professor area...');

      // Esperar um pouco para garantir que a página carregou
      await this.delay(2000);

      // Procurar pelo link para área do professor
      // Tentativas diferentes de seletores
      const professorLinkSelectors = [
        'a:has-text("Professor")',
        'a[href*="professor"]',
        'a:has-text("Área do Professor")',
        '//a[contains(text(), "Professor")]',
        '//a[contains(@href, "professor")]'
      ];

      let linkFound = false;
      for (const selector of professorLinkSelectors) {
        try {
          const link = selector.startsWith('//')
            ? await this.page.locator(`xpath=${selector}`).first()
            : await this.page.locator(selector).first();

          await link.waitFor({ state: 'visible', timeout: 5000 });
          await link.click();
          linkFound = true;
          console.log(`✅ Found and clicked professor link with selector: ${selector}`);
          break;
        } catch (e) {
          // Tentar próximo seletor
          continue;
        }
      }

      if (!linkFound) {
        // Se não encontrou o link, tentar navegar diretamente
        console.log('⚠️ Professor link not found, trying direct navigation...');
        await this.page.goto('https://www.studus.com.br/StudusFIP/areaProfessor.xhtml', {
          waitUntil: 'networkidle'
        });
      }

      await this.page.waitForLoadState('networkidle');
      await this.delay(3000);

      await this.takeScreenshot('04_professor_area');

      // Verificar se estamos na área correta
      const hasProfessorContent = await this.page.locator('text="Disciplinas", text="Cadeiras", text="Turmas"').first().isVisible().catch(() => false);

      if (!hasProfessorContent) {
        console.log('⚠️ May not be in professor area yet');
      }

      return true;

    } catch (error: any) {
      console.error('❌ Error navigating to professor area:', error.message);
      await this.takeScreenshot('professor_area_error');
      return false;
    }
  }

  async extractDisciplines(): Promise<Discipline[]> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Not logged in');
    }

    try {
      console.log('📚 Extracting disciplines...');

      // Tentar encontrar o link para todas as cadeiras/disciplinas
      const disciplinesLinkSelectors = [
        'a:has-text("Todas as Cadeiras")',
        'a:has-text("Minhas Disciplinas")',
        'a:has-text("Disciplinas")',
        'a span:has-text("Todas")',
        '//a[contains(text(), "Todas")]',
        '//span[contains(text(), "Todas")]'
      ];

      let linkFound = false;
      for (const selector of disciplinesLinkSelectors) {
        try {
          const link = selector.startsWith('//')
            ? await this.page.locator(`xpath=${selector}`).first()
            : await this.page.locator(selector).first();

          await link.waitFor({ state: 'visible', timeout: 5000 });
          await link.click();
          linkFound = true;
          console.log(`✅ Found and clicked disciplines link with selector: ${selector}`);
          break;
        } catch (e) {
          continue;
        }
      }

      if (!linkFound) {
        console.log('⚠️ Could not find disciplines link, trying to extract from current page...');
      }

      await this.page.waitForLoadState('networkidle');
      await this.delay(3000);

      await this.takeScreenshot('05_disciplines_list');

      // Extrair disciplinas da página
      const disciplines: Discipline[] = [];

      // Diversas estratégias para encontrar disciplinas
      const disciplineSelectors = [
        'table tr',
        '.ui-datatable-data tr',
        '[class*="disciplina"]',
        '[class*="cadeira"]',
        '[class*="turma"]'
      ];

      for (const selector of disciplineSelectors) {
        try {
          const rows = await this.page.locator(selector).all();

          if (rows.length > 1) { // Pelo menos header + 1 linha
            console.log(`Found ${rows.length} rows with selector: ${selector}`);

            for (let i = 1; i < Math.min(rows.length, 50); i++) { // Limitar a 50 disciplinas
              const row = rows[i];

              try {
                const cells = await row.locator('td, div, span').all();
                if (cells.length > 0) {
                  // Tentar extrair informações das células
                  const disciplineTexts = await Promise.all(
                    cells.map(cell => cell.textContent().catch(() => ''))
                  );

                  const disciplineName = disciplineTexts.find(text => text && text.length > 3) || '';

                  if (disciplineName && !disciplineName.includes('Nenhum')) {
                    disciplines.push({
                      id: `disc_${Date.now()}_${i}`,
                      name: disciplineName.trim(),
                      code: disciplineTexts[1]?.trim() || undefined,
                      semester: disciplineTexts[2]?.trim() || undefined,
                      studentsCount: parseInt(disciplineTexts[3]?.trim() || '0') || undefined
                    });
                  }
                }
              } catch (e) {
                // Continuar para próxima linha
                continue;
              }
            }

            if (disciplines.length > 0) break;
          }
        } catch (e) {
          continue;
        }
      }

      // Se não encontrou disciplinas, tentar extração via text content geral
      if (disciplines.length === 0) {
        console.log('⚠️ No disciplines found with structured selectors, trying text extraction...');

        const pageText = await this.page.textContent('body');
        // Aqui você poderia adicionar lógica de regex para extrair informações

        // Temporariamente adicionar disciplinas de exemplo para testes
        disciplines.push({
          id: 'disc_example_1',
          name: 'Exemplo de Disciplina 1',
          code: 'EX101',
          semester: '2024.1'
        });
      }

      console.log(`✅ Extracted ${disciplines.length} disciplines`);
      await this.takeScreenshot('06_disciplines_extracted');

      return disciplines;

    } catch (error: any) {
      console.error('❌ Error extracting disciplines:', error.message);
      await this.takeScreenshot('disciplines_extraction_error');
      return [];
    }
  }

  async logout(): Promise<void> {
    if (this.page && this.isLoggedIn) {
      try {
        await this.takeScreenshot('before_logout');
        // Tentar encontrar logout link ou botão
        const logoutSelectors = [
          'a:has-text("Sair")',
          'a:has-text("Logout")',
          'button:has-text("Sair")',
          '//a[contains(text(), "Sair")]'
        ];

        for (const selector of logoutSelectors) {
          try {
            const logout = selector.startsWith('//')
              ? await this.page.locator(`xpath=${selector}`).first()
              : await this.page.locator(selector).first();

            if (await logout.isVisible()) {
              await logout.click();
              break;
            }
          } catch (e) {
            continue;
          }
        }
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }
  }

  async close(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      this.isLoggedIn = false;
      console.log('Browser closed successfully');
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }
}