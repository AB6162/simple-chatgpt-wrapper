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

    console.log(codeInput);

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

    if (prompt_uses >= 50) {

        await pageManager.reload();

        try {

            await pageManager.locator('div[id="prompt-textarea"]').waitFor({ timeout: 120000 });

            prompt_uses = 0;

        } catch (error) {
            console.log('Fail to reload page '+error);
            return false;
        }

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
        return false;
    }

    await delay(900);

    var streaming_element = await pageManager.locator('.streaming-animation');

    await streaming_element.waitFor({ state: 'attached', timeout: 30000 });

    await streaming_element.waitFor({ state: 'detached', timeout: 10000 });

    try {

        await delay(500);

        const elements = await pageManager.locator('.markdown').all();

        let elementsText = [];

        for (const element of elements) {
            const elementText = await element.textContent();  // Método directo en Locator
            elementsText.push(elementText);
        }

        if (elementsText.length > 0) {
            prompt_uses++;
        }

        if (elementsText.length > last_tam) {
            last_tam = elementsText.length;
            return elementsText[elementsText.length - 1];
        } else {
            return false;
        }

    } catch (error) {
        console.log(error);
        return false;
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