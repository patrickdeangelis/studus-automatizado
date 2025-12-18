import { Job } from 'bullmq';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { EncryptionService } from '../services/encryption';
import { userSessionManager } from '../session/UserSessionManager';

import { Page } from 'playwright';

export const performLogin = async (userId: number, username?: string, password?: string, jobId?: string, existingPage?: Page) => {
    // 1. Resolve Credentials (Payload -> DB)
    let finalUsername = username;
    let finalPassword = password;

    // Try to get credentials from database if not provided
    if (!finalUsername || !finalPassword) {
        const dbUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (dbUser.length > 0) {
            finalUsername = finalUsername || dbUser[0].studusUsername || undefined;

            // Decrypt password if stored encrypted
            if (dbUser[0].studusPassword && !finalPassword) {
                if (dbUser[0].encrypted && process.env.ENCRYPTION_MASTER_KEY) {
                    try {
                        finalPassword = EncryptionService.decrypt(dbUser[0].studusPassword, process.env.ENCRYPTION_MASTER_KEY);
                    } catch (error) {
                        console.error(`Failed to decrypt password for user ${userId}:`, error);
                        throw new Error('Failed to decrypt stored credentials');
                    }
                } else if (!dbUser[0].encrypted) {
                    // Legacy: password stored in plain text (should encrypt it)
                    finalPassword = dbUser[0].studusPassword;
                }
            }
        }
    }

    if (!finalUsername || !finalPassword) {
        throw new Error('Credenciais (username/password) não encontradas no payload ou BD.');
    }

    let page = existingPage;
    let context;

    if (!page) {
        // Usar UserSessionManager em vez do StudusBrowser singleton
        context = await userSessionManager.getSession(userId);
        page = await context.newPage();
    } else {
        context = page.context();
    }

    const logPrefix = jobId ? `[Job ${jobId}]` : '[Auto-Login]';

    try {
        console.log(`${logPrefix} Navigating to Login Page...`);
        await page.goto('https://www.studus.com.br/StudusFIP/login.xhtml', { waitUntil: 'networkidle', timeout: 60000 });

        // Selectors from Playwright Recorder
        if (await page.isVisible('#j_username')) {
            await page.fill('#j_username', finalUsername);
            await page.fill('#j_password', finalPassword);
            
            // Optional: Remember me
            if (await page.isVisible('#remember span')) {
                await page.click('#remember span').catch(() => {});
            }

            await page.click('button[type="submit"], button:has-text("Acessar")');
        } else {
            // Fallback to generic if IDs change dynamically (JSF sometimes changes prefix)
            console.log(`${logPrefix} Standard ID #j_username not found, trying generic fallback...`);
            await page.fill('input[type="text"]', finalUsername);
            await page.fill('input[type="password"]', finalPassword);
            await page.click('button[type="submit"]');
        }
        
        console.log(`${logPrefix} Credentials submitted. Waiting for navigation...`);
        await page.waitForLoadState('networkidle');

        // Handle "Não, obrigado" popup if it appears after login
        try {
            const popupBtn = page.getByRole('button', { name: 'Não, obrigado' });
            if (await popupBtn.isVisible({ timeout: 5000 })) {
                await popupBtn.click();
                console.log(`${logPrefix} Dismissed popup.`);
            }
        } catch (e) {}

        // Navigate to Professor Area (Icon "school")
        // The recorder used getByRole('link', { name: 'school' })
        try {
            await page.getByRole('link', { name: 'school' }).click();
            await page.waitForLoadState('networkidle');
        } catch (e) {
            // Fallback to XPath if icon text fails
            const professorLinkXpath = '/html/body/div[1]/div[2]/div/ul/li[2]/a';
            if (await page.isVisible(`xpath=${professorLinkXpath}`)) {
                await page.click(`xpath=${professorLinkXpath}`);
            }
        }

        // Capture Cookies
        const cookies = await context.cookies();
        console.log(`${logPrefix} Login Successful. Captured ${cookies.length} cookies.`);

        // Save cookies in UserSessionManager cache
        await userSessionManager.saveSessionCookies(userId, context);

        // Save session with encrypted password
        const masterKey = process.env.ENCRYPTION_MASTER_KEY;
        let encryptedPassword = finalPassword;
        let isEncrypted = false;

        if (masterKey) {
            try {
                encryptedPassword = EncryptionService.encrypt(finalPassword, masterKey);
                isEncrypted = true;
                console.log(`${logPrefix} Password encrypted successfully`);
            } catch (error) {
                console.error(`${logPrefix} Failed to encrypt password:`, error);
                // Store plain text as fallback but mark as not encrypted
            }
        }

        // Update user in database
        await db.update(users).set({
            cookies: JSON.stringify(cookies),
            studusUsername: finalUsername,
            studusPassword: encryptedPassword,
            encrypted: isEncrypted,
            updatedAt: new Date()
        }).where(eq(users.id, userId));

        console.log(`${logPrefix} Session updated for user ${userId}`);

        if (!existingPage) await page.close();
        return { success: true, message: 'Login realizado e sessão salva.' };

    } catch (error: any) {
        console.error(`${logPrefix} Login Failed:`, error);
        const screenshotName = `error-login-${jobId || 'auto'}-${Date.now()}.png`;
        await page.screenshot({ path: `/app/apps/worker/screenshots/${screenshotName}` });
        if (!existingPage) await page.close();
        throw new Error(`Login failed: ${error.message}`);
    }
};

export const processLogin = async (job: Job) => {
    let { username, password, userId } = job.data;
    const targetUserId = userId || 1;
    return await performLogin(targetUserId, username, password, job.id);
};
