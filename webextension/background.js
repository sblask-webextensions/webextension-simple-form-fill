"use strict";

browser.browserAction.onClicked.addListener(function() {
    browser.runtime.openOptionsPage();
});

var port = browser.runtime.connect({name: "sync-simple-preferences"});
port.onMessage.addListener((data) => {
    if (data) {
        browser.storage.local.set(data);
    }
});

browser.storage.onChanged.addListener(() => {
    browser.storage.local.get("items", result => {
        browser.runtime.sendMessage({items: result.items});
    });
});
