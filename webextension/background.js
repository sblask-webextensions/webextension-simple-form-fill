"use strict";

const AUTOCOMPLETE_KEY = "autocompleteEnabled";
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

function sendItemList(tabId, frameId) {
    console.log("Send items to tab " + tabId + " and frame " + frameId);
    let options = {};
    if (frameId) {
        options.frameId = frameId;
    }

    browser.storage.local.get([ITEMS_KEY])
        .then((result)      => { return result[ITEMS_KEY] || ""; })
        .then((itemsString) => { return itemsString ? itemsString.split(/\r?\n/) : []; })
        .then((itemList)    => { return browser.tabs.sendMessage(tabId, {itemList: itemList}, options); });
}

function sendItemsToActiveTab() {
    console.log("Send items to active tab");
    browser.tabs.query({currentWindow: true, active: true})
        .then((matchingTabs) => { sendItemList(matchingTabs[0].id); });
}

function onUpdated(tabId, changeInfo) {
    if (changeInfo.status == "complete") {
        console.log("New page loaded, check for inputs");
        browser.tabs.executeScript(tabId, {file: "content-scripts/checker.js", allFrames: true});
    }
}

function onMessage(message, sender) {
    if (message.text == "refreshAutocomplete") {
        if (message.requireInizialization) {
            console.log("Background got request to initialize autocompletes");
            initializeAutocomplete(sender.tab.id, sender.frameId);
        } else {
            console.log("Background got request to refresh autocompletes");
            sendItemList(sender.tab.id, sender.frameId);
        }
    }
}

function initializeAutocomplete(tabId, frameId) {
    console.log("Initialize autocomplete for tab " + tabId + " and frame " + frameId);
    browser.tabs.executeScript(tabId, {file: "content-scripts/jquery-3.1.1.js", allFrames: true})
        .then(() => { return browser.tabs.executeScript(tabId, {file: "content-scripts/jquery-ui-1.12.1.js",  frameId: frameId}); })
        .then(() => { return browser.tabs.executeScript(tabId, {file: "content-scripts/autocomplete.js",      frameId: frameId}); })
        .then(() => { return browser.tabs.insertCSS(tabId,     {file: "content-scripts/jquery-ui-1.12.1.css", frameId: frameId}); })
        .then(() => { return browser.tabs.insertCSS(tabId,     {file: "content-scripts/autocomplete.css",     frameId: frameId}); })
        .then(() => { sendItemList(tabId, frameId); });
}

let autocompleteEnabled = false;
function enableDisableAutocomplete(enable) {
    if (enable && !autocompleteEnabled) {
        console.log("Enable autocomplete");
        browser.tabs.onUpdated.addListener(onUpdated);
        browser.runtime.onMessage.addListener(onMessage);
        browser.tabs.onActivated.addListener(sendItemsToActiveTab);
        browser.storage.onChanged.addListener(sendItemsToActiveTab);
        autocompleteEnabled = true;
    } else if (!enable && autocompleteEnabled) {
        console.log("Disable autocomplete");
        browser.tabs.onUpdated.removeListener(onUpdated);
        browser.runtime.onMessage.removeListener(onMessage);
        browser.tabs.onActivated.removeListener(sendItemsToActiveTab);
        browser.storage.onChanged.removeListener(sendItemsToActiveTab);
        autocompleteEnabled = false;
    }
}

browser.storage.onChanged.addListener((changes) => {
    if (changes[AUTOCOMPLETE_KEY]) {
        console.log("Autocomplete setting changed to " + changes[AUTOCOMPLETE_KEY].newValue);
        enableDisableAutocomplete(changes[AUTOCOMPLETE_KEY].newValue);
    }
});

browser.storage.local.get([AUTOCOMPLETE_KEY])
    .then((result) => {
        enableDisableAutocomplete(result[AUTOCOMPLETE_KEY]);
    });
