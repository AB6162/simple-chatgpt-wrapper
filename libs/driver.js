const { chromium } = require('patchright');
const ShyMouse = require('@ab6162/shy-mouse-playwright');

var browser = null;
var page = null;
var data_dir = null;
var shyMouse = null;

const launchBrowser = async (options = {}) => {

    data_dir = options.data_dir || "datadir/";

    browser = await chromium.launchPersistentContext(data_dir, {
        channel: "chrome",
        headless: false,
    });

};

const closeBrowser = async () => {

    if (browser) {
        await browser.close();
        browser = null;
    }

};

const newPage = async () => {

    if (!browser) {
        await launchBrowser({data_dir: data_dir || "datadir/"});
    }

    page = await browser.newPage();

    return page;

};

const getElementById = async (id) => {

    if (!page) {
        throw new Error("No page available. Please create a new page first.");
    }

    const element = await page.locator(`#${id}`);

    const isVisible = await element.isVisible();

    if (isVisible) {
        return element;
    } else {
        return null;
    }

};

const getElementByClass = async (className) => {

    if (!page) {
        throw new Error("No page available. Please create a new page first.");
    }

    const element = await page.locator(`.${className}`);

    const isVisible = await element.isVisible();

    if (isVisible) {
        return element;
    } else {
        return null;
    }

};

const getElementByTagName = async (tagName) => {

    if (!page) {
        throw new Error("No page available. Please create a new page first.");
    }

    const element = await page.locator(`${tagName}`);

    const isVisible = await element.isVisible();

    if (isVisible) {
        return element;
    } else {
        return null;
    }

};

const getElementByXPath = async (xpath) => {

    if (!page) {
        throw new Error("No page available. Please create a new page first.");
    }

    const element = await page.locator(`xpath=//${xpath}`);

    const isVisible = await element.isVisible();

    if (isVisible) {
        return element;
    } else {
        return null;
    }

};

const getElementByName = async (name) => {

    if (!page) {
        throw new Error("No page available. Please create a new page first.");
    }

    const element = await page.locator(`[name="${name}"]`);

    const isVisible = await element.isVisible();

    if (isVisible) {
        return element;
    } else {
        return null;
    }

};

const initShyMouse = () => {

    if (!page) {
        throw new Error("No page available. Please create a new page first.");
    }

    return new ShyMouse(page);

};

const clickElement = async (element, anonClick = true) => {

    if (!shyMouse) {
        shyMouse = initShyMouse();
    }

    if (anonClick) {
        await shyMouse.click(element);
    } else {
        await element.click();
    }

};

const moveMouse = async (options = {}) => {

    if (!shyMouse) {
        shyMouse = initShyMouse();
    }

    await shyMouse.move(options);

};

module.exports = {
    launchBrowser,
    closeBrowser,
    newPage,
    getElementById,
    getElementByClass,
    getElementByTagName,
    getElementByXPath,
    getElementByName,
    browser,
    page,
    initShyMouse,
    clickElement,
    moveMouse
};
