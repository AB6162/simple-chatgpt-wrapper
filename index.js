const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')

let pageManager = null;
let browserManager = null;
let username = null;
let passw = null;
let prompt_uses = 0;

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

    //*[@id="__next"]/div[1]/div[1]/div/div/div/div/nav/div[2]/div[2]/button[2]

    await waitTimeout(2200);

    try {

        const btnModal = await page.waitForXPath(
            '//*[@id="radix-:r7:"]/div/div/a'
        );

        if (btnModal) {
            btnModal.click();
        }

    } catch (error) {
        console.log('Error click modal');
    }

    await waitTimeout(1500);

    try {

        const btnLogin = await page.waitForXPath(
            '//*[@id="root"]/div/main/section/div[2]/p/a'
        );

        if (btnLogin.textContent === 'Login') {

            if (btnLogin) {
                btnLogin.click();
            }

        }

    } catch (error) {
        console.log('Error click go login');
    }

    try {

        const btnLogin = await page.waitForXPath(
            '//*[@id="__next"]/div[1]/div[2]/div[1]/div/div/button[1]'
        );

        if (btnLogin) {
            btnLogin.click();
        }

    } catch (error) {

        try {

            const btnLogin = await page.waitForXPath(
                '//*[@id="__next"]/div[1]/div[1]/div/div/div/div/nav/div[2]/div[2]/button[2]'
            );

            if (btnLogin) {
                btnLogin.click();
            }

        } catch (error) {

            try {

                const btnLogin = await page.waitForXPath(
                    '//*[@id="root"]/div/main/section/div[2]/p/a'
                );

                if (btnLogin.textContent === 'Login') {
                    if (btnLogin) {
                        btnLogin.click();
                    }
                }

            }  catch (error) {
                console.log('Error click login');
            }

        }

    }

    let statusCloudflare = await checkCloudflare(page);

    if (statusCloudflare) {

        while (statusCloudflare) {

            console.log('Cloudflare detected!');

            await waitTimeout(3000);

            statusCloudflare = await checkCloudflare(page);

        }

    }

    try {

        await page.waitForSelector('input[name="email"]');

        await page.click('input[name="email"]');

        await page.type('input[name="email"]', userName, { delay: 150 });

    } catch (error) {

        console.log('Fail to type email');

        try {

            await page.waitForSelector('input[name="username"]');

            await page.click('input[name="username"]');

            await page.type('input[name="username"]', userName, { delay: 150 });

        } catch (error) {
            console.log('Fail to type username');
        }

    }

    try {
        await page.waitForSelector('button.continue-btn')
        await page.click('button.continue-btn');
    } catch (error) {
        console.log('Fail to click continue');
    }

    try {

        await page.waitForXPath(
            '/html/body/div/main/section/div/div/div/div[1]/div/form/div[2]/button'
        );

        await waitTimeout(1700);

        let continueLogin = await page.$x(
            '/html/body/div/main/section/div/div/div/div[1]/div/form/div[2]/button'
        );
        continueLogin[0].click();

    } catch (error) {
        console.log('Fail to click continue 2');
    }

    await page.waitForSelector('input[name="password"]');

    await page.type('input[name="password"]', password, { delay: 150 });

    await page.waitForXPath(
        '/html/body/div[1]/main/section/div/div/div/form/div[2]/button'
    );

    await waitTimeout(1700);

    ///html/body/div[1]/main/section/div/div/div/form/div[2]/button

    let login = await page.$x(
        '/html/body/div[1]/main/section/div/div/div/form/div[2]/button'
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
        return 'NO_ELEMENT';
    }

}

async function sendMessage(message) {

    /*
    await pageManager.type(
        'textarea[id="prompt-textarea"]',
        message
    );
    */

    if (prompt_uses >= 50) {

        await pageManager.reload();

        try {

            await pageManager.waitForSelector('textarea[id="prompt-textarea"]', { timeout: 30000 });

            prompt_uses = 0;

        } catch (error) {
            console.log('Fail to reload page '+error);
            return false;
        }

    }

    ////*[@id="__next"]/div[1]/div/main/div[1]/div[2]/div[1]/div[2]/button/div
    ///html/body/div[1]/div[1]/div/main/div[1]/div[2]/div[1]/div[2]/button/div

    ////*[@id="__next"]/div[1]/div[2]/main/div[2]/div[2]/div[1]/div/form/div/div[2]/div/button

    ////*[@id="__next"]/div[1]/div[2]/main/div[2]/div[2]/div[1]/div/form/div/div[2]/div/button

    ////*[@id="__next"]/div[1]/div[2]/main/div[1]/div[2]/div[1]/div/form/div/div[2]/div/div/button

    ////*[@id="__next"]/div[1]/div[2]/main/div[2]/div[2]/div[1]/div/form/div/div[2]/div/button

    try {

        //await pageManager.keyboard.type(message);
        await pageManager.$eval('textarea[id="prompt-textarea"]', (el, value) => el.value = value, message);

        await waitTimeout(1200);

        await pageManager.type(
            'textarea[id="prompt-textarea"]',
            ' '
        );

    } catch (error) {
        console.log('Rate limited');
        await waitTimeout(3600000);
        await pageManager.reload();
    }

    await waitTimeout(2200);

    try {

        //await pageManager.keyboard.type(message);
        await pageManager.$eval('textarea[id="prompt-textarea"]', (el, value) => el.value = value, message);

        await waitTimeout(1200);

        await pageManager.type(
            'textarea[id="prompt-textarea"]',
            ' '
        );

    } catch (error) {
        return false;
    }

    await waitTimeout(1700);

    //await pageManager.keyboard.press('Enter');

    let pageClicked = true;

    try {

        let submit_msg = await pageManager.$x(
            '//*[@id="__next"]/div[1]/div[2]/main/div[2]/div[2]/div[1]/div/form/div/div[2]/div/button'
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

                try {

                    let submit_msg = await pageManager.$x(
                        '//*[@id="__next"]/div[1]/div[2]/main/div[1]/div[2]/div[1]/div/form/div/div[2]/div/div/button'
                    );

                    submit_msg[0].click();

                } catch (error) {
                    console.log('Fail to send message');
                }

            }

        }

    }

    try {

        await pageManager.waitForSelector('.result-streaming', { timeout: 60000 });

    } catch (error) {

        let status_network = await checkErrorNetwork();

        if (status_network === false) {

            console.log('Rated limit reached, waiting 10 minutes to continue.');
            await waitTimeout(600000);
            await pageManager.reload();

            try {

                await pageManager.waitForSelector('textarea[id="prompt-textarea"]', { timeout: 30000 });

                await pageManager.$eval('textarea[id="prompt-textarea"]', (el, value) => el.value = value, message);

                await waitTimeout(1200);

                await pageManager.type(
                    'textarea[id="prompt-textarea"]',
                    ' '
                );

                try {

                    let submit_msg = await pageManager.$x(
                        '//*[@id="__next"]/div[1]/div[2]/main/div[2]/div[2]/div[1]/div/form/div/div[2]/div/button'
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

                            try {

                                let submit_msg = await pageManager.$x(
                                    '//*[@id="__next"]/div[1]/div[2]/main/div[1]/div[2]/div[1]/div/form/div/div[2]/div/div/button'
                                );

                                submit_msg[0].click();

                            } catch (error) {
                                console.log('Fail to send message');
                            }

                        }

                    }

                }

            } catch (error) {
                console.log('Fail to reload page '+error);
                return false;
            }

        } else if (status_network === 'NO_ELEMENT') {

            await pageManager.reload();

            try {

                await pageManager.waitForSelector('textarea[id="prompt-textarea"]', { timeout: 30000 });

                await pageManager.$eval('textarea[id="prompt-textarea"]', (el, value) => el.value = value, message);

                await waitTimeout(1200);

                await pageManager.type(
                    'textarea[id="prompt-textarea"]',
                    ' '
                );

                try {

                    let submit_msg = await pageManager.$x(
                        '//*[@id="__next"]/div[1]/div[2]/main/div[2]/div[2]/div[1]/div/form/div/div[2]/div/button'
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

                            try {

                                let submit_msg = await pageManager.$x(
                                    '//*[@id="__next"]/div[1]/div[2]/main/div[1]/div[2]/div[1]/div/form/div/div[2]/div/div/button'
                                );

                                submit_msg[0].click();

                            } catch (error) {
                                console.log('Fail to send message');
                            }

                        }

                    }

                }

            } catch (error) {
                console.log('Fail to reload page '+error);
                return false;
            }

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
                console.log('Rated limit reached, waiting 10 minutes to continue.');
                await waitTimeout(600000);
            }

            let status_network = await checkErrorNetwork();

            if (status_network === false) {

                continue;

            } else if (status_network === 'NO_ELEMENT') {

                await pageManager.reload();

                try {

                    await pageManager.waitForSelector('textarea[id="prompt-textarea"]', { timeout: 30000 });

                    await pageManager.$eval('textarea[id="prompt-textarea"]', (el, value) => el.value = value, message);

                    await waitTimeout(1200);

                    await pageManager.type(
                        'textarea[id="prompt-textarea"]',
                        ' '
                    );

                    try {

                        let submit_msg = await pageManager.$x(
                            '//*[@id="__next"]/div[1]/div[2]/main/div[2]/div[2]/div[1]/div/form/div/div[2]/div/button'
                        );

                        submit_msg[0].click();

                    } catch (error) {

                        console.log('Fail to send message 1');

                    }

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

                                try {

                                    let submit_msg = await pageManager.$x(
                                        '//*[@id="__next"]/div[1]/div[2]/main/div[1]/div[2]/div[1]/div/form/div/div[2]/div/div/button'
                                    );

                                    submit_msg[0].click();

                                } catch (error) {
                                    console.log('Fail to send message');
                                }

                            }

                        }

                    }

                } catch (error) {
                    console.log('Fail to reload page '+error);
                    return false;
                }

            }

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

    if (elements.length > 0) {
        prompt_uses++;
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

async function destroy() {

    try {
        await pageManager.close();
    } catch (error) {
        console.log('Error on destroy tab');
    }

    try {
        await browserManager.close();
    } catch (error) {
        console.log('Error on destroy');
    }

}

module.exports = { login, sendMessage, stillLoggedIn, destroy };