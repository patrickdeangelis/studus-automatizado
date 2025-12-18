import { chromium } from 'playwright';

(async () => {
    console.log('🕵️ Inspecionando Registro de Aulas e Frequências...');
    
    const username = process.env.STUDUS_USERNAME;
    const password = process.env.STUDUS_PASSWORD;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // 1. Login
        console.log('🔑 Logando...');
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

        // 4. Clicar no botão "Registro de Aula" da primeira disciplina
        // O ID geralmente termina em ":registro" e tem ícone "ui-icon-list"
        console.log('📅 Acessando Registro de Aulas...');
        const registroButton = page.locator('button[id$=":registro"]').first();
        
        if (await registroButton.count() === 0) {
            console.error('❌ Botão de Registro de Aula não encontrado!');
            await page.screenshot({ path: '/app/apps/worker/screenshots/inspect-classes-fail.png' });
            return;
        }

        await registroButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(5000);

        // 5. Analisar Lista de Aulas
        console.log('🔍 Analisando Tabela de Aulas...');
        await page.screenshot({ path: '/app/apps/worker/screenshots/classes-list.png', fullPage: true });
        
        // Dump HTML da lista
        await require('fs/promises').writeFile('/app/apps/worker/screenshots/classes-list.html', await page.content());

        // Tentar identificar linhas da tabela de aulas
        const rows = await page.locator('.ui-datatable-data tr').all();
        console.log(`Encontradas ${rows.length} aulas registradas.`);

        if (rows.length > 0) {
            const firstRow = rows[0];
            console.log('Exemplo de Aula (Texto):', await firstRow.innerText());
            
            // Tentar entrar na frequência (botão "Frequência" ou similar)
            // Geralmente é um botão na linha. Vamos listar os botões da linha.
            const buttons = await firstRow.locator('button, a.ui-commandlink').all();
            console.log(`Botões na linha da aula: ${buttons.length}`);
            
            for (const btn of buttons) {
                const title = await btn.getAttribute('title');
                const text = await btn.innerText();
                console.log(`- Botão: "${text}" Title: "${title}"`);
                
                if (title?.includes('Frequência') || text.includes('Frequência') || (await btn.getAttribute('class'))?.includes('green')) {
                    console.log('👉 Clicando em Frequência...');
                    await btn.click();
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(3000);
                    
                    console.log('🔍 Analisando Tela de Frequência...');
                    await page.screenshot({ path: '/app/apps/worker/screenshots/attendance-list.png', fullPage: true });
                    await require('fs/promises').writeFile('/app/apps/worker/screenshots/attendance-list.html', await page.content());
                    break;
                }
            }
        }

    } catch (e) {
        console.error('❌ Erro:', e);
        await page.screenshot({ path: '/app/apps/worker/screenshots/inspect-classes-error.png' });
    } finally {
        await browser.close();
    }
})();
