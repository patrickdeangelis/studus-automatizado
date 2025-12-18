import { chromium } from 'playwright';

(async () => {
    console.log('🕵️ Iniciando Inspeção do Studus...');
    
    const username = process.env.STUDUS_USERNAME;
    const password = process.env.STUDUS_PASSWORD;

    if (!username || !password) {
        console.error('❌ Credenciais não encontradas no ENV');
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // 1. Login
        console.log('🔑 Logando...');
        await page.goto('https://www.studus.com.br/StudusFIP/login.xhtml');
        
        // Tentativa genérica de preencher login (baseado no que já sabemos que funciona)
        const userSelectors = ['input[name*="user"]', 'input[id*="user"]', 'input[type="text"]'];
        for (const s of userSelectors) {
            if (await page.isVisible(s)) {
                await page.fill(s, username);
                break;
            }
        }
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"], input[type="submit"], a[onclick*="submit"]');
        await page.waitForLoadState('networkidle');

        // 2. Acessar Área do Professor
        console.log('👨‍🏫 Acessando Área do Professor...');
        await page.click('xpath=/html/body/div[1]/div[2]/div/ul/li[2]/a');
        await page.waitForLoadState('networkidle');

        // 3. Acessar Lista de Cadeiras
        console.log('📚 Acessando Lista de Disciplinas...');
        await page.click('xpath=/html/body/div[1]/div[2]/div/div/div[2]/div[2]/div/div[1]/form/ul/li/a/span[1]');
        
        // Esperar tabela carregar
        await page.waitForTimeout(5000); 

        // 4. Analisar Tabela
        console.log('🔍 Analisando Estrutura da Tabela...');
        
        // Pegar a primeira linha de dados da tabela (assumindo PrimeFaces .ui-datatable-data)
        const rows = await page.locator('.ui-datatable-data tr').all();
        
        if (rows.length === 0 || (await rows[0].innerText()).includes('Não há registros')) {
            console.log('⚠️ Tabela vazia ou "Não há registros" detectado.');
            console.log('Dumping HTML para análise de filtros/seletores...');
            const html = await page.content();
            console.log(html);
            await page.screenshot({ path: '/app/apps/worker/screenshots/inspect-empty.png', fullPage: true });
            console.log('📸 Screenshot salvo em apps/worker/screenshots/inspect-empty.png');
        } else {
            console.log(`✅ Encontradas ${rows.length} disciplinas.`);
            
            // Analisar a primeira linha detalhadamente
            const firstRow = rows[0];
            console.log('\n--- Estrutura da 1ª Linha ---');
            console.log('Texto:', await firstRow.innerText());
            console.log('HTML:', await firstRow.innerHTML());
            
            console.log('\n--- Buscando Botões/Links de Ação ---');
            const links = await firstRow.locator('a, button, .ui-commandlink').all();
            for (const link of links) {
                const title = await link.getAttribute('title');
                const text = await link.innerText();
                const id = await link.getAttribute('id');
                const onclick = await link.getAttribute('onclick');
                const href = await link.getAttribute('href');
                
                console.log(`[Ação] ID: ${id} | Title: ${title} | Text: ${text} | OnClick: ${onclick} | Href: ${href}`);
            }
        }

    } catch (e) {
        console.error('❌ Erro na inspeção:', e);
        await page.screenshot({ path: 'inspect-error.png' });
    } finally {
        await browser.close();
    }
})();
