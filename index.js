const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')

let pageManager = null;
let browserManager = null;
let username = null;
let passw = null;

async function login(userName, password) {

    puppeteer.use(StealthPlugin())

    const browser = await puppeteer.launch(
        {
            headless: false,
        }
    );

    //const context = await browser.createIncognitoBrowserContext();

    const page = await browser.newPage();
    await page.goto('https://chat.openai.com/auth/login');

    await waitTimeout(2200);

    const btnLogin = await page.waitForXPath(
        '//*[@id="__next"]/div[1]/div[2]/div[1]/div/div/button[1]'
    );

    if (btnLogin) {
        btnLogin.click();
    }

    let statusCloudflare = await checkCloudflare(page);

    if (statusCloudflare) {

        while (statusCloudflare) {

            console.log('Cloudflare detected!');

            await waitTimeout(3000);

            statusCloudflare = await checkCloudflare(page);

        }

    }

    await page.waitForSelector('input[name="username"]');

    await page.type('input[name="username"]', userName, { delay: 150 });

    await page.waitForXPath(
        '/html/body/div/main/section/div/div/div/div[1]/div/form/div[2]/button'
    );

    await waitTimeout(1700);

    let continueLogin = await page.$x(
        '/html/body/div/main/section/div/div/div/div[1]/div/form/div[2]/button'
    );
    continueLogin[0].click();

    await page.waitForSelector('input[name="password"]');

    await page.type('input[name="password"]', password, { delay: 150 });

    await page.waitForXPath(
        '/html/body/div[1]/main/section/div/div/div/form/div[3]/button'
    );

    await waitTimeout(1700);

    let login = await page.$x(
        '/html/body/div[1]/main/section/div/div/div/form/div[3]/button'
    );
    login[0].click();

    await waitTimeout(30000);

    let statusLogin = await validateLogin(page);

    if (statusLogin) {
        pageManager = page;
        browserManager = browser;
        username = userName;
        passw = password;
        await waitTimeout(1800);
        return true;
    } else {
        return null;
    }

}

async function waitTimeout(time) {

    await new Promise(resolve => setTimeout(resolve, time));

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
        await page.waitForSelector('textarea[id="prompt-textarea"]');
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
        return (document.evaluate('//div[@class="flex-1 overflow-hidden"]//div[p]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.attributes.class.nodeValue).includes('text-red');
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

            console.log('Probando conexión a internet');
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
        return false;
    }

}

async function sendMessage(message) {

    /*
    await pageManager.type(
        'textarea[id="prompt-textarea"]',
        message
    );
    */

    //await pageManager.keyboard.type(message);
    await page.$eval('textarea[id="prompt-textarea"]', (el, value) => el.value = value, message);

    await waitTimeout(1700);

    //await pageManager.keyboard.press('Enter');

    let pageClicked = true;

    try {

        let submit_msg = await pageManager.$x(
            '//*[@id="__next"]/div[1]/div[2]/main/div[2]/div[2]/form/div/div[2]/div/button'
        );

        submit_msg[0].click();

    } catch (error) {

        try {

            let submit_msg = await pageManager.$x(
                '//*[@id="__next"]/div[1]/div/main/div[1]/div[2]/form/div/div/div/button'
            );

            submit_msg[0].click();

        } catch (error) {

            try {

                let submit_msg = await pageManager.$x(
                    '//*[@id="__next"]/div[1]/div[2]/main/div[2]/div[2]/form/div/div/div/button'
                );

                submit_msg[0].click();

            } catch (error) {
                console.log('Fail to send message');
            }

        }

    }

    try {

        await pageManager.waitForSelector('.result-streaming', { timeout: 60000 });

    } catch (error) {

        let status_network = await checkErrorNetwork();

        if (!status_network) {
            console.log('Network error waiting for selector');
            await browserManager.close();
            return false;
        }

    }

    let retries_network = 0;

    while (true) {

        try {

            pageClicked = await pageManager.evaluate(() => {
                return !!document.querySelector('.result-streaming')
            });

            if ( (!pageClicked) ) {
                await waitTimeout(1300);
                break;
            }

        } catch (error) {

            if (retries_network > 2) {
                console.log('Network error waiting for response');
                await browserManager.close();
                return false;
            }

            let status_network = await checkErrorNetwork();

            retries_network++;

        }

    }

    const elements = await pageManager.$$('.markdown');

    let elementsText = [];

    for (const element of elements) {
        const elementText = await pageManager.evaluate(
            element => element.textContent, element
        );
        elementsText.push(elementText);
    }

    return elementsText[elementsText.length - 1];

}

async function stillLoggedIn() {

    try {
        await pageManager.waitForSelector('textarea[id="prompt-textarea"]');
        return true;
    } catch (error) {
        return false;
    }

}

module.exports = { login, sendMessage, stillLoggedIn };