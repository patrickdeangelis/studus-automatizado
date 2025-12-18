import { Job } from 'bullmq';
import { StudusBrowser } from '../automation/browser';
import { db } from '../db';
import { users, disciplines, students, grades, tasks, lessons, attendances } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { performLogin } from './login';
import fs from 'fs/promises';

export const processSync = async (job: Job) => {
    const { userId } = job.data;
    const targetUserId = userId || 1;
    
    // Performance Metrics
    const startTime = Date.now();
    const metrics = { login: 0, navigation: 0, scraping: 0, total: 0 };

    await db.update(tasks as any).set({ startedAt: new Date() }).where(eq(tasks.id, Number(job.id)));

    // 1. Get Session
    let [user] = await db.select().from(users).where(eq(users.id, targetUserId));
    
    const loginStart = Date.now();
    if (!user || !user.cookies) {
        console.log(`[Job ${job.id}] Session missing. Attempting Auto-Login...`);
        await performLogin(targetUserId, undefined, undefined, job.id);
        [user] = await db.select().from(users).where(eq(users.id, targetUserId));
    }
    metrics.login = Date.now() - loginStart;

    const browser = StudusBrowser.getInstance();
    const context = await browser.newContext();
    
    try {
        const cookies = JSON.parse(user.cookies as string);
        await context.addCookies(cookies);
    } catch (e) {
        const t0 = Date.now();
        console.log(`[Job ${job.id}] Invalid cookies. Re-authenticating...`);
        await performLogin(targetUserId, undefined, undefined, job.id);
        metrics.login += (Date.now() - t0);
    }
    
    const page = await context.newPage();

    // Helper: Reset Navigation to List using EXACT steps provided
    const resetNavigation = async () => {
        const t0 = Date.now();
        console.log(`[Job ${job.id}] Resetting navigation via Home...`);
        
        await page.goto('https://www.studus.com.br/StudusFIP/privado/index.xhtml').catch(() => page.goto('https://www.studus.com.br/StudusFIP/login.xhtml'));
        await page.waitForLoadState('networkidle');

        // Check Login/Popup
        if (await page.isVisible('#j_username') || await page.isVisible('input[type="password"]')) {
             console.log(`[Job ${job.id}] Session expired. Re-authenticating...`);
             await performLogin(targetUserId, undefined, undefined, job.id, page);
        }

        // Popup "Não, obrigado"
        try {
            const popup = page.getByRole('button', { name: 'Não, obrigado' });
            if (await popup.isVisible({ timeout: 2000 })) await popup.click();
        } catch (e) {}

        // Icon "school" (Professor Area)
        console.log(`[Job ${job.id}] Clicking 'school' icon...`);
        await page.getByRole('link', { name: 'school' }).click();
        await page.waitForLoadState('networkidle');

        // Icon "assignment_turned_in" (Disciplines List)
        console.log(`[Job ${job.id}] Clicking 'assignment_turned_in' icon...`);
        await page.getByRole('link', { name: 'assignment_turned_in' }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000); 
        
        metrics.navigation += (Date.now() - t0);
    };

    try {
        await resetNavigation();

        // Count Cards
        const scrapeStart = Date.now();
        const initialCards = await page.locator('div.card').all();
        const cardCount = initialCards.length;
        console.log(`[Job ${job.id}] Found ${cardCount} discipline cards.`);

        for (let i = 0; i < cardCount; i++) {
            console.log(`[Job ${job.id}] --- Processing Card ${i+1}/${cardCount} ---`);

            // Ensure at List
            if (i > 0) await resetNavigation();
            
            let cards = await page.locator('div.card').all();
            if (i >= cards.length) break;
            let card = cards[i];
            
            // Extract Info
            let code = await card.locator('label.italic').innerText().catch(() => '');
            let turma = await card.locator('label.small-font').innerText().catch(() => '');
            let name = await card.locator('label.big-font').innerText().catch(() => '');
            let disciplineId = `${code.replace(/\./g, '')}-${turma.replace(/\s/g, '')}` || `disc-${i}`;

            if (name) {
                console.log(`[Job ${job.id}] Discipline: ${name}`);
                
                // Save Discipline
                try {
                    const [existingDisc] = await db.select().from(disciplines).where(eq(disciplines.id, disciplineId));
                    if (existingDisc) {
                        await db.update(disciplines).set({ name, code, class: turma, lastSyncAt: new Date() }).where(eq(disciplines.id, disciplineId));
                    } else {
                        await db.insert(disciplines).values({ id: disciplineId, name, code, class: turma, lastSyncAt: new Date() });
                    }
                } catch (e) {}

                // --- PART 1: LESSONS & ATTENDANCE ---
                // Selector provided: button[name="j_idt161:0:j_idt177:registro"]
                // We need to match the button inside the CURRENT card (which might be index i)
                const registroButton = card.locator('button[id$=":registro"]');
                
                if (await registroButton.count() > 0) {
                    console.log(`[Job ${job.id}] Entering Classes page (Registro)...`);
                    await registroButton.click();
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(3000);

                    const lessonRows = await page.locator('.ui-datatable-data tr').all();
                    console.log(`[Job ${job.id}] Found ${lessonRows.length} lessons.`);

                    for (const row of lessonRows) {
                        const cells = await row.locator('td').all();
                        if (cells.length > 2) {
                            const date = await cells[0].innerText();
                            const content = await cells[1].innerText();
                            const lessonId = `${disciplineId}-${date.replace(/\//g, '')}`;

                            try {
                                const [existingLesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
                                if (!existingLesson) {
                                    await db.insert(lessons).values({ id: lessonId, disciplineId, date, content });
                                }
                            } catch (e) {}

                            // Click "check_circle" (Frequência)
                            // Selector provided: getByRole('link', { name: 'check_circle' })
                            const freqButton = row.getByRole('link', { name: 'check_circle' });
                            // Or fallback to generic text search
                            const freqFallback = row.locator('a:has-text("check_circle"), button:has-text("check_circle")');

                            let targetBtn = (await freqButton.count() > 0) ? freqButton : freqFallback;

                            if (await targetBtn.count() > 0) {
                                await targetBtn.first().click();
                                await page.waitForLoadState('networkidle');
                                await page.waitForTimeout(2000);

                                // Scrape Attendance Modal/Page
                                // URL pattern: frequencia.xhtml?idTurma=...
                                const studentRows = await page.locator('tbody tr').all();
                                for (const sRow of studentRows) {
                                    const sCells = await sRow.locator('td').all();
                                    if (sCells.length > 1) {
                                        const sId = await sCells[0].innerText().catch(() => '');
                                        const checkbox = sRow.locator('.ui-chkbox-box');
                                        const isPresent = (await checkbox.getAttribute('class'))?.includes('ui-state-active') || false;
                                        
                                        if (sId) {
                                            try {
                                                const [existing] = await db.select().from(attendances).where(and(eq(attendances.lessonId, lessonId), eq(attendances.studentId, sId)));
                                                if (existing) {
                                                    await db.update(attendances).set({ present: isPresent, updatedAt: new Date() }).where(eq(attendances.id, existing.id));
                                                } else {
                                                    await db.insert(attendances).values({ lessonId, studentId: sId, present: isPresent });
                                                }
                                            } catch (e) {}
                                        }
                                    }
                                }
                                
                                // Go Back from Attendance to Lessons List
                                // Usually browser Back works if it was a navigation, or close modal
                                if (page.url().includes('frequencia.xhtml')) {
                                    await page.goBack();
                                    await page.waitForLoadState('networkidle');
                                } else {
                                    // It was a modal? Try Escape
                                    await page.keyboard.press('Escape');
                                }
                                await page.waitForTimeout(1000);
                            }
                        }
                    }
                }

                // --- PART 2: GRADES ---
                // Reset to List again to be safe
                await resetNavigation();
                
                cards = await page.locator('div.card').all();
                card = cards[i]; // Re-get card
                
                const notasButton = card.locator('button[id$=":notas"]');
                if (await notasButton.count() > 0) {
                    console.log(`[Job ${job.id}] Entering Grades page...`);
                    await notasButton.click();
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(3000);

                    const rows = await page.locator('tbody.ui-datatable-data tr').all();
                    for (const row of rows) {
                        const cells = await row.locator('td').all();
                        if (cells.length > 8) {
                            const studentId = await cells[0].innerText().catch(() => ''); 
                            const studentName = await cells[1].innerText().catch(() => '');
                            
                            if (!studentId || !studentName) continue;

                            const getVal = async (idx: number) => {
                                const input = cells[idx].locator('input');
                                return (await input.count() > 0) ? await input.inputValue() : await cells[idx].innerText();
                            };

                            const n1 = await getVal(2);
                            const n2 = await getVal(3);
                            const n3 = await getVal(4);
                            const faults = await getVal(5);
                            const average = await cells[7].innerText().catch(() => ''); 
                            const situation = await cells[10].innerText().catch(() => ''); 

                            const [existingStudent] = await db.select().from(students).where(eq(students.id, studentId));
                            if (!existingStudent) {
                                await db.insert(students).values({ id: studentId, name: studentName });
                            }

                            const [existingGrade] = await db.select().from(grades).where(
                                and(eq(grades.studentId, studentId), eq(grades.disciplineId, disciplineId))
                            );

                            if (existingGrade) {
                                await db.update(grades).set({
                                    n1, n2, n3, faults, average, situation, updatedAt: new Date()
                                }).where(eq(grades.id, existingGrade.id));
                            } else {
                                await db.insert(grades).values({
                                    studentId, disciplineId, n1, n2, n3, faults, average, situation
                                });
                            }
                        }
                    }
                }
            }
        }
        
        metrics.scraping = Date.now() - scrapeStart;
        metrics.total = Date.now() - startTime;

        await db.update(tasks as any).set({ 
            performance: JSON.stringify(metrics),
            completedAt: new Date(),
            status: 'COMPLETED',
            progress: 100
        }).where(eq(tasks.id, Number(job.id)));

        await page.close();
        return { 
            success: true, 
            message: `Sincronização completa. Tempo: ${Math.round(metrics.total/1000)}s`
        };

    } catch (error: any) {
        console.error(`[Job ${job.id}] Sync Failed:`, error);
        await page.screenshot({ path: `/app/apps/worker/screenshots/error-sync-${job.id}.png` });
        await page.close();
        throw error;
    }
};
