const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')

let pageManager = null;
let browserManager = null;
let username = null;
let passw = null;
let prompt_uses = 0;
let last_tam = 0;

async function login(userName, password, headless = false) {

    puppeteer.use(StealthPlugin())

    const browser = await puppeteer.launch(
        {
            headless: headless,
        }
    );

    const page = await browser.newPage();
    await page.goto('https://chat.openai.com/auth/login');

    await waitTimeout(1000);

    try {

        const btnModal = await page.waitForSelector(
            '//*[@id="radix-:r7:"]/div/div/a'
        );

        if (btnModal) {
            btnModal.click();
        }

    } catch (error) {
    }

    await waitTimeout(1000);

    try {

        await page.waitForSelector('[data-testid="login-button"]');

        await page.click('[data-testid="login-button"]');


    } catch (error) {

        return false;

    }

    let statusCloudflare = await checkCloudflare(page);

    if (statusCloudflare) {

        while (statusCloudflare) {

            console.log('Cloudflare detected!');

            await waitTimeout(1500);

            statusCloudflare = await checkCloudflare(page);

        }

    }

    try {

        await page.waitForSelector('input[name="email"]');

        await page.click('input[name="email"]');

        await page.type('input[name="email"]', userName, { delay: 150 });

    } catch (error) {

        try {

            await page.waitForSelector('input[name="username"]');

            await page.click('input[name="username"]');

            await page.type('input[name="username"]', userName, { delay: 150 });

        } catch (error) {

            try {

                await page.waitForSelector('input[id="email-or-phone-input"]');

                await page.click('input[id="email-or-phone-input"]');

                await page.type('input[id="email-or-phone-input"]', userName, { delay: 150 });

            } catch (error) {

                return false;

            }

        }

    }

    try {
        // /html/body/div/main/section/div[2]/div[1]/form/div/input
        await page.waitForSelector('button[value="email"]');
        await waitTimeout(5698);
        await page.click('button[value="email"]');
    } catch (error) {
        console.log('Fail to click continue');
        await page.waitForSelector('input.continue-btn')
        await page.click('input.continue-btn');
        // click xpath /html/body/div/main/section/div[2]/div[1]/form/div/input
        //await page.waitForSelector('/html/body/div/main/section/div[2]/div[1]/form/div/input');
        //await page.click('/html/body/div/main/section/div[2]/div[1]/form/div/input');
    }

    /*
    try {

        await page.waitForSelector(
            '/html/body/div/main/section/div/div/div/div[1]/div/form/div[2]/button'
        );

        await waitTimeout(1000);

        let continueLogin = await page.$$(
            '/html/body/div/main/section/div/div/div/div[1]/div/form/div[2]/button'
        );

        continueLogin[0].click();

    } catch (error) {
    }
    */

    await page.waitForSelector('input[name="password"]');

    await page.type('input[name="password"]', password, { delay: 150 });

    await waitTimeout(2658);

    await page.waitForSelector('xpath/.//button[text()="Continue"]');
    const [continueButton] = await page.$$('xpath/.//button[text()="Continue"]');


    if (continueButton) {
        await continueButton.click();
    } else {
        console.log('Continue button not found');
    }

    await waitTimeout(4500);

    let statusLogin = await validateLogin(page);

    if (statusLogin) {
        pageManager = page;
        browserManager = browser;
        username = userName;
        passw = password;
        await waitTimeout(1000);
        await checkIfExistRazon();
        return true;
    } else {
        return null;
    }

}

async function checkIfExistRazon() {

    try {
        //document.querySelector("#radix-\\:rmj\\: > div > div.mb-0\\.5.flex.gap-2 > button")

        await pageManager.waitForSelector('#radix-\\:rmj\\: > div > div.mb-0\\.5.flex.gap-2 > button');

        await pageManager.evaluate(() => {
            document.querySelector("#radix-\\:rmj\\: > div > div.mb-0\\.5.flex.gap-2 > button").click();
        });

    } catch (error) {
        console.log('No razon found');
    }

    return true;

}

async function waitTimeout(time) {

    return await new Promise(resolve => setTimeout(resolve, time));

}

async function checkCloudflare(page) {

    try {
        await page.waitForSelector('form[id="challenge-form"]');
        return true;
    } catch (error) {
        return false;
    }

}

async function validateLogin(page) {

    try {
        await page.waitForSelector('div[id="prompt-textarea"]');
        return true;
    } catch (error) {
        return false;
    }

}

async function hasInternet() {

    try {

        const response = await fetch('https://www.google.com');
        return true;

    } catch (error) {

        return false;

    }

}

async function checkErrorNetwork() {

    var networkError = false;

    networkError = await pageManager.evaluate(() => {
        try {
            return (document.evaluate('//div[@class="flex-1 overflow-hidden"]//div[p]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.attributes.class.nodeValue).includes('text-red');
        } catch (error) {
            return false;
        }
    });

    if (networkError) {

        //init ping
        let ping = await hasInternet();

        let retries = 0;

        while (!ping) {

            if (retries > 12) {
                break;
            }

            retries++;

            ping = await hasInternet();

            if (ping) {
                break;
            }

            await waitTimeout(10000);

        }

        if (!ping) {
            return false;
        }

        try {

            let regenerate_btn = await pageManager.$x(
                '//*[@id="__next"]/div[1]/div[2]/main/div[2]/div[2]/div[1]/div[2]/button'
            );

            regenerate_btn[0].click();

            return true;

        } catch (error) {

            console.log('Fail to regenerate');
            return false;

        }

    } else {
        console.log('No error element found');
        return 'NO_ELEMENT';
    }

}

async function sendMessage(message) {

    if (prompt_uses >= 50) {

        await pageManager.reload();

        try {

            await pageManager.waitForSelector('div[id="prompt-textarea"]', { timeout: 30000 });

            prompt_uses = 0;

        } catch (error) {
            console.log('Fail to reload page '+error);
            return false;
        }

    }

    try {

        await checkIfExistRazon();

        await pageManager.evaluate((message) => {
            const element = document.getElementById('prompt-textarea');
            element.innerHTML = `<p>${message}</p>`;
        }, message);

    } catch (error) {
        console.log('Rate limited');
        await waitTimeout(3600000);
        await pageManager.reload();
    }

    await waitTimeout(2200);

    let pageClicked = true;

    try {

        await checkIfExistRazon();

        await pageManager.waitForSelector('[data-testid="send-button"]');

        await pageManager.evaluate(() => {
            document.querySelector('[data-testid="send-button"]').click();
        });

    } catch (error) {
        return false;
    }

    try {

        await checkIfExistRazon();

        await pageManager.waitForSelector('.result-streaming', { timeout: 10000 });

        while (true) {

            pageClicked = await pageManager.evaluate(() => {
                return !!document.querySelector('.result-streaming');
            });

            if (!pageClicked) {
                break;
            }

            await waitTimeout(1500);

        }

    } catch (error) {

        console.log('Error on streaming');

    }

    try {

        await waitTimeout(500);

        const elements = await pageManager.$$('.markdown');

        let elementsText = [];

        for (const element of elements) {
            const elementText = await pageManager.evaluate(
                element => element.textContent, element
            );
            elementsText.push(elementText);
        }

        if (elementsText.length > 0) {
            prompt_uses++;
        }

        if (elementsText.length > last_tam) {
            last_tam = elementsText.length;
            console.log('Catch new message');
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
        await pageManager.waitForSelector('div[id="prompt-textarea"]');
        return true;
    } catch (error) {
        return false;
    }

}

async function destroy() {

    try {
        await pageManager.close();
    } catch (error) {
        console.log('Error');
    }

    try {
        await browserManager.close();
    } catch (error) {
        console.log('Error');
    }

}

module.exports = { login, sendMessage, stillLoggedIn, destroy };