const pw = require('./libs/driver.js');
const readline = require('readline');

let pageManager = null;
let browserManager = null;
let username = null;
let passw = null;
let prompt_uses = 0;
let last_tam = 0;

async function login(userName, password) {

    var data_dir_user = 'datadir/' + userName.replace(/[@.]/g, '_') + '/';

    console.log('Using data dir: ' + data_dir_user);

    browserManager = await pw.launchBrowser({data_dir: data_dir_user});

    pageManager = await pw.newPage();

    await pageManager.goto('https://chat.openai.com/auth/login');

    await delay(1800);

    try {
        var status_login = await stillLoggedIn();

        if (status_login) {
            return true;
        }

    } catch (error) {
    }

    var loginButton = await pageManager.getByTestId('login-button');

    await pw.clickElement(loginButton);

    await pageManager.locator('input[name="email"]').waitFor({ timeout: 60000 });

    await delay();

    await pageManager.locator('input[name="email"]').fill(userName);

    await delay();

    var nextButton = await pageManager.locator('button[name="intent"][value="email"]');

    await nextButton.waitFor({ timeout: 60000 });

    await pw.clickElement(nextButton);

    await pageManager.locator('input[name="current-password"]').waitFor({ timeout: 60000 });

    await delay();

    await pageManager.locator('input[name="current-password"]').fill(password);

    await delay();

    var nextButton = await pageManager.locator('button[data-dd-action-name="Continue"]');

    await pw.clickElement(nextButton);

    await delay(1200);

    //reviso código
    var codeInput = await pageManager.locator('input[name="code"]');
    await codeInput.waitFor({ timeout: 15000 });

    if (codeInput) {

        var code = await input('Enter the code sent to your email: ');

        await pageManager.locator('input[name="code"]').fill(code);

        await delay();

        var verifyButton = await pageManager.locator('button[name="intent"][value="validate"]');

        await pw.clickElement(verifyButton);

    }

    try {
        var prompt = await pageManager.locator('div[id="prompt-textarea"]');
        await prompt.waitFor({ timeout: 120000 });
    } catch (error) {
        console.log('Error waiting for prompt textarea:', error);
        return false;
    }

    return true;

}

const input = async (prompt) => {

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => rl.question(prompt, ans => {
        rl.close();
        resolve(ans);
    }));

}

async function sendMessage(message) {

    if (prompt_uses >= 10) {

        await pageManager.reload();

        await delay(1900);

        try {

            await pageManager.locator('div[id="prompt-textarea"]').waitFor({ timeout: 120000 });

            prompt_uses = 0;

        } catch (error) {
            console.log('Fail to reload page '+error);
            return false;
        }

    }

    try {

        var close_btn_popup = await pageManager.getByTestId('close-button');

        await close_btn_popup.waitFor({ timeout: 2000 });

        await pw.clickElement(close_btn_popup, false);

    } catch (error) {
    }

    try {

        await pageManager.evaluate((message) => {
            const element = document.getElementById('prompt-textarea');
            element.innerHTML = `<p>${message}</p>`;
        }, message);

    } catch (error) {
        console.log('Rate limited');
        await delay(300000);
        await pageManager.reload();
    }

    await delay(2200);

    try {

        await pageManager.getByTestId('send-button').waitFor({ timeout: 60000 });

        var sendButton = await pageManager.getByTestId('send-button');

        await pw.clickElement(sendButton);

    } catch (error) {
        console.log('Error clicking send button:', error);
        return false;
    }

    await delay(900);

    await waitingStreaming();

    try {

        await delay(2500);

        var { count, lastText } = await pageManager.evaluate(() => {

            const elements = document.querySelectorAll('.markdown');
            const count = elements.length;

            if (count === 0) {
                return { count: 0, lastText: null };
            }

            // Obtener el último elemento
            const lastElement = elements[elements.length - 1];
            let text = lastElement.textContent.trim();

            return { count: count, lastText: text };

        });

        if (count > last_tam) {

            if (lastText.includes('Something went wrong while generating the response.')) {

                console.log('Error: Something went wrong while generating the response.');
                console.log('Try again in 1 minute.');
                await pageManager.reload();
                return false;

            }

            prompt_uses++;
            last_tam = count;
            return lastText;

        } else {
            console.log('No new responses received.');
            return false;
        }

    } catch (error) {
        console.log(error);
        return false;
    }

}

async function waitingStreaming() {
    const STREAMING_TIMEOUT = 90 * 1000; // Total timeout for streaming to finish (e.g., 90 seconds)
    const ATTACHED_TIMEOUT = 30 * 1000; // Initial wait for attached
    const DETACHED_CHECK_TIMEOUT = 10 * 1000; // How long to wait for each detachment check
    const FINAL_DETACHED_DELAY = 500; // Small delay to confirm detachment

    try {
        const streaming_locator = pageManager.locator('.streaming-animation');

        // Wait for the streaming animation to appear, indicating streaming has started.
        await streaming_locator.waitFor({ state: 'attached', timeout: ATTACHED_TIMEOUT });

        const startTime = Date.now();
        let isStreaming = true;

        while (isStreaming && (Date.now() - startTime < STREAMING_TIMEOUT)) {
            try {
                // Wait for it to detach (disappear).
                // If it reappears quickly, this will re-throw (timeout) and keep the loop going.
                await streaming_locator.waitFor({ state: 'detached', timeout: DETACHED_CHECK_TIMEOUT });

                // Add a small delay after detachment to ensure it's truly finished and not just a flicker
                await delay(FINAL_DETACHED_DELAY);

                // After the delay, check if it's still detached.
                // If it re-attached, `isVisibleAfterDelay` will be true, and the loop continues.
                const isVisibleAfterDelay = await streaming_locator.isVisible();
                if (!isVisibleAfterDelay) {
                    isStreaming = false; // It stayed detached, so streaming is likely complete.
                }
            } catch (e) {
                // If waitFor({ state: 'detached' }) timed out, it means the element is still attached or reappeared.
                // We just continue the loop to check again, as long as the STREAMING_TIMEOUT hasn't passed.
                console.log('Streaming animation still present or reappeared, retrying...');
            }
        }

        if (isStreaming) {
            console.log('Warning: Streaming did not complete within the allotted time.');
            // Optionally, throw an error or handle this case more explicitly if it's a critical failure.
        }

    } catch (error) {
        // If the initial attached waitFor times out, it means streaming never started, which might be an error condition
        // or a race condition where streaming finished before we could detect it.
        console.log('Error in waitingStreaming (initial attachment or general error): ', error);
    }
}

async function stillLoggedIn() {

    try {

        var element = await pageManager.locator('div[id="prompt-textarea"]');

        await element.waitFor({ timeout: 15000 });

        if (element) {
            return true;
        } else {
            return false;
        }

    } catch (error) {
        return false;
    }

}

async function destroy() {

    try {
        await pageManager.close();
    } catch (error) {
        console.log('Error closing page manager:', error);
    }

    try {
        await browserManager.close();
    } catch (error) {
        console.log('Error closing browser manager:', error);
    }

}

async function delay(time = 1500) {
    return new Promise(resolve => setTimeout(resolve, time));
}

module.exports = { login, sendMessage, stillLoggedIn, destroy, delay };