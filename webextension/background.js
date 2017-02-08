"use strict";

const ITEMS_KEY = "items";

browser.browserAction.onClicked.addListener(function() {
    browser.runtime.openOptionsPage();
});

// keep sdk part up to date
browser.storage.onChanged.addListener((changes) => {
    if (changes[ITEMS_KEY] && changes[ITEMS_KEY].newValue) {
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
    console.log("Send items");
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
    if (changeInfo.status == "complete") {
        console.log("New page loaded, check for inputs");
        browser.tabs.executeScript(tabId, {file: "content-scripts/checker.js"})
            .then(() => { browser.tabs.sendMessage(tabId, {tabId: tabId}); });
    }
}

function initializeAutocomplete(tabId) {
    browser.tabs.executeScript(tabId, {file: "content-scripts/jquery-3.1.1.js"})
        .then(() => { return browser.tabs.executeScript(tabId, {file: "content-scripts/jquery-ui-1.12.1.js"}); })
        .then(() => { return browser.tabs.executeScript(tabId, {file: "content-scripts/autocomplete.js"}); })
        .then(() => { return browser.tabs.insertCSS(tabId,     {file: "content-scripts/jquery-ui-1.12.1.css"}); })
        .then(() => { return browser.tabs.insertCSS(tabId,     {file: "content-scripts/autocomplete.css"}); })
        .then(() => { sendItemList(tabId); });
}

browser.tabs.onUpdated.addListener(onUpdated);

browser.runtime.onMessage.addListener(message => {
    if (message.text == "refreshAutocomplete") {
        console.log("Background got request to refresh autocompletes");
        if (message.requireInizialization) {
            initializeAutocomplete(message.tabId);
        } else {
            sendItemList(message.tabId);
        }
    }
});

browser.tabs.onActivated.addListener(sendItemsToActiveTab);
browser.storage.onChanged.addListener(sendItemsToActiveTab);
