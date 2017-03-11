"use strict";

const AUTOCOMPLETE_KEY = "autocompleteEnabled";
const ITEMS_KEY = "items";
const USE_TAB_KEY = "useTabToChooseItems";

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

function sendOptions(tabId, frameId) {
    console.log("Send items to tab " + tabId + " and frame " + frameId);
    let options = {};
    if (frameId) {
        options.frameId = frameId;
    }

    browser.storage.local.get([ITEMS_KEY, USE_TAB_KEY])
        .then((result) => { return browser.tabs.sendMessage(tabId, resultToOptions(result), options); });
}

function resultToOptions(result) {
    let items = [];
    if (result[ITEMS_KEY]) {
        items = result[ITEMS_KEY].split(/\r?\n/);
    }

    return {
        itemList: items,
        useTabToChooseItems: result[USE_TAB_KEY],
    };
}

function sendOptionsToActiveTab() {
    console.log("Send items to active tab");
    browser.tabs.query({currentWindow: true, active: true})
        .then((matchingTabs) => { sendOptions(matchingTabs[0].id); });
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
            sendOptions(sender.tab.id, sender.frameId);
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
        .then(() => { sendOptions(tabId, frameId); });
}

let autocompleteEnabled = false;
function enableDisableAutocomplete(enable) {
    if (enable && !autocompleteEnabled) {
        console.log("Enable autocomplete");
        browser.tabs.onUpdated.addListener(onUpdated);
        browser.runtime.onMessage.addListener(onMessage);
        browser.tabs.onActivated.addListener(sendOptionsToActiveTab);
        browser.storage.onChanged.addListener(sendOptionsToActiveTab);
        autocompleteEnabled = true;
    } else if (!enable && autocompleteEnabled) {
        console.log("Disable autocomplete");
        browser.tabs.onUpdated.removeListener(onUpdated);
        browser.runtime.onMessage.removeListener(onMessage);
        browser.tabs.onActivated.removeListener(sendOptionsToActiveTab);
        browser.storage.onChanged.removeListener(sendOptionsToActiveTab);
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
