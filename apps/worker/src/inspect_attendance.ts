import { chromium } from 'playwright';

(async () => {
    console.log('🕵️ Inspecionando Detalhes da Frequência...');
    
    const username = process.env.STUDUS_USERNAME;
    const password = process.env.STUDUS_PASSWORD;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Login e Navegação até Lista de Aulas (Simplificado)
        await page.goto('https://www.studus.com.br/StudusFIP/login.xhtml');
        const userSelectors = ['input[name*="user"]', 'input[id*="user"]', 'input[type="text"]'];
        for (const s of userSelectors) { if (await page.isVisible(s)) { await page.fill(s, username!); break; } }
        await page.fill('input[type="password"]', password!);
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
        await page.click('xpath=/html/body/div[1]/div[2]/div/ul/li[2]/a');
        await page.waitForLoadState('networkidle');
        await page.click('xpath=/html/body/div[1]/div[2]/div/div/div[2]/div[2]/div/div[1]/form/ul/li/a/span[1]');
        await page.waitForTimeout(5000);
        
        // Entrar em Registro de Aula
        await page.locator('button[id$=":registro"]').first().click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Clicar no botão de Frequência (check_circle) da primeira aula
        console.log('👉 Clicando no botão de Frequência (check_circle)...');
        // Material icons often rendered as text ligatures
        const freqButton = page.locator('button:has-text("check_circle"), a:has-text("check_circle")').first();
        
        if (await freqButton.count() > 0) {
            await freqButton.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000); // Modal ou navegação?

            console.log('🔍 Analisando Tela/Modal de Frequência...');
            await page.screenshot({ path: '/app/apps/worker/screenshots/attendance-detail.png', fullPage: true });
            
            // Dump HTML
            const html = await page.content();
            await require('fs/promises').writeFile('/app/apps/worker/screenshots/attendance-dump.html', html);

            // Tentar identificar lista de alunos
            // Geralmente checkbox de presença
            const checkboxes = await page.locator('input[type="checkbox"]').all();
            console.log(`Encontrados ${checkboxes.length} checkboxes.`);
            
            // Identificar linhas da tabela de alunos
            const rows = await page.locator('tbody tr').all();
            console.log(`Encontradas ${rows.length} linhas na tabela.`);
            
            if (rows.length > 0) {
                console.log('Exemplo de Aluno (Texto):', await rows[0].innerText());
            }

        } else {
            console.error('Botão de frequência não encontrado.');
        }

    } catch (e) {
        console.error('❌ Erro:', e);
    } finally {
        await browser.close();
    }
})();
