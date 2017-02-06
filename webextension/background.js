"use strict";

const ITEMS_KEY = "items";

browser.browserAction.onClicked.addListener(function() {
    browser.runtime.openOptionsPage();
});

// keep sdk part up to date
browser.storage.onChanged.addListener((changes) => {
    if (changes[ITEMS_KEY]) {
        browser.runtime.sendMessage({items: changes[ITEMS_KEY].newValue});
    }
});

// get data from SDK part
let port = browser.runtime.connect({name: "sync-simple-preferences"});
port.onMessage.addListener((data) => {
    console.log(`Got data from SDK part: ${data}`);
    if (data) {
        browser.storage.local.set(data);
    }
});

function sendItemList(tabId) {
    console.log("Sending to ${tabId}")
    browser.storage.local.get([ITEMS_KEY])
        .then((result) => { return result[ITEMS_KEY] || ""; })
        .then((itemsString) => { return itemsString ? itemsString.split(/\r?\n/) : []; })
        .then((itemList) => { return browser.tabs.sendMessage(tabId, {itemList: itemList}); });
}

function sendItemsToActiveTab() {
    browser.tabs.query({currentWindow: true, active: true})
        .then((matchingTabs) => { sendItemList(matchingTabs[0].id); });
}

function onUpdated(tabId, changeInfo) {
    if (changeInfo.status != "complete") {
        return;
    }

    let checkingForInputs = browser.tabs.executeScript(tabId, {
        code: "document.getElementsByTagName('input').length",
        allFrames: true,
    });

    checkingForInputs
        .then(continueIfGreaterThanZero)
        .then(() => { return browser.tabs.executeScript(tabId, {allFrames: true, file: "content-scripts/jquery-3.1.1.js"}); })
        .then(() => { return browser.tabs.executeScript(tabId, {allFrames: true, file: "content-scripts/jquery-ui-1.12.1.js"}); })
        .then(() => { return browser.tabs.executeScript(tabId, {allFrames: true, file: "content-scripts/autocomplete.js"}); })
        .then(() => { return browser.tabs.insertCSS(tabId,     {allFrames: true, file: "content-scripts/jquery-ui-1.12.1.css"}); })
        .then(() => { return browser.tabs.insertCSS(tabId,     {allFrames: true, file: "content-scripts/autocomplete.css"}); })
        .then(() => { sendItemList(tabId); });
}

function continueIfGreaterThanZero(inputCounts) {
    return new Promise(function(resolve, reject) {
        let numberOfInputs = inputCounts.reduce((x, y) => x + y);
        if (numberOfInputs > 0) {
            resolve();
        } else {
            reject();
        }
    });
}

browser.tabs.onUpdated.addListener(onUpdated);
browser.tabs.onActivated.addListener(sendItemsToActiveTab);

browser.storage.onChanged.addListener(sendItemsToActiveTab);
