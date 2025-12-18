import { chromium } from 'playwright';

(async () => {
    console.log('🕵️ Inspecionando Página de Notas...');
    
    const username = process.env.STUDUS_USERNAME;
    const password = process.env.STUDUS_PASSWORD;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // 1. Login
        await page.goto('https://www.studus.com.br/StudusFIP/login.xhtml');
        const userSelectors = ['input[name*="user"]', 'input[id*="user"]', 'input[type="text"]'];
        for (const s of userSelectors) { if (await page.isVisible(s)) { await page.fill(s, username!); break; } }
        await page.fill('input[type="password"]', password!);
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');

        // 2. Acessar Professor
        await page.click('xpath=/html/body/div[1]/div[2]/div/ul/li[2]/a');
        await page.waitForLoadState('networkidle');

        // 3. Acessar Disciplinas
        await page.click('xpath=/html/body/div[1]/div[2]/div/div/div[2]/div[2]/div/div[1]/form/ul/li/a/span[1]');
        await page.waitForTimeout(5000);

        // 4. Clicar no botão "Notas" da primeira disciplina
        console.log('📝 Entrando na página de Notas...');
        const notasButton = page.locator('button[id$=":notas"]').first();
        await notasButton.click();
        
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(5000);

        // 5. Analisar Página de Notas
        console.log('🔍 Analisando Estrutura de Notas...');
        console.log('URL Atual:', page.url());
        
        await page.screenshot({ path: '/app/apps/worker/screenshots/inspect-grades.png', fullPage: true });
        
        // Procurar por tabela de alunos
        const tables = await page.locator('table').all();
        console.log(`Encontradas ${tables.length} tabelas na página de notas.`);

        for (const [i, table] of tables.entries()) {
            const headers = await table.locator('th').allInnerTexts();
            console.log(`Tabela ${i} Headers:`, headers.join(' | '));
            
            const firstRow = await table.locator('tbody tr').first();
            if (await firstRow.count() > 0) {
                console.log(`Tabela ${i} 1ª Linha:`, await firstRow.innerText());
            }
        }

        // Dump do HTML da página de notas
        await require('fs/promises').writeFile('/app/apps/worker/screenshots/grades-dump.html', await page.content());

    } catch (e) {
        console.error('❌ Erro:', e);
    } finally {
        await browser.close();
    }
})();
