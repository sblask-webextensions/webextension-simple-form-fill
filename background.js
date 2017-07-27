"use strict";

const ITEMS_KEY = "items";
const AUTOCOMPLETE_KEY = "autocompleteEnabled";
const USE_TAB_KEY = "useTabToChooseItems";
const COMMENT_STRING_KEY = "commentString";

const CONTEXT_MENU_ROOT_ID = "root";
const CONTEXT_MENU_PREFERENCES_ID = "preferences";
const CONTEXT_MENU_SEPARATOR_ID = "separator";
const CONTEXT_MENU_ADD_SELECTION_ID = "add-selection";

function updateContextMenu(items) {
    browser.contextMenus.removeAll().then(() => fillContextMenu(items));
}

function fillContextMenu(items) {
    browser.contextMenus.create({
        id: CONTEXT_MENU_ROOT_ID,
        title: "Simple Form Fill",
        contexts: ["all"],
    });
    browser.contextMenus.create({
        id: CONTEXT_MENU_PREFERENCES_ID,
        parentId: CONTEXT_MENU_ROOT_ID,
        title: "Preferences",
        contexts: ["all"],
    });
    browser.contextMenus.create({
        id: CONTEXT_MENU_ADD_SELECTION_ID,
        parentId: CONTEXT_MENU_ROOT_ID,
        title: "Add '%s'",
        contexts: ["selection"],
    });

    if (items.length > 0) {
        browser.contextMenus.create({
            id: CONTEXT_MENU_SEPARATOR_ID,
            parentId: CONTEXT_MENU_ROOT_ID,
            type: "separator",
            contexts: ["editable"],
        });
        for (let item of items) {
            browser.contextMenus.create({
                id: item,
                parentId: CONTEXT_MENU_ROOT_ID,
                title: item,
                contexts: ["editable"],
            });
        }
    }
}

browser.contextMenus.onClicked.addListener((info, tab) => {
    switch (info.menuItemId) {
        case CONTEXT_MENU_PREFERENCES_ID:
            browser.runtime.openOptionsPage();
            break;
        case CONTEXT_MENU_ADD_SELECTION_ID:
            addItem(info.selectionText);
            break;
        default:
            chainPromises([
                ()              => { return browser.tabs.executeScript(tab.id, {file: "browser-polyfill.js", allFrames: true}); },
                ()              => { return browser.tabs.executeScript(tab.id, {file: "content-scripts/insert-item.js", allFrames: true}); },
                ()              => { return browser.storage.local.get([COMMENT_STRING_KEY]); },
                (result)        => { return result[COMMENT_STRING_KEY] || ""; },
                (commentString) => { return commentString ? info.menuItemId.split(commentString)[0] : info.menuItemId; },
                (cleanedItem)   => { return browser.tabs.sendMessage(tab.id, {item: cleanedItem}); },
            ]);

    }
});

function addItem(item) {
    browser.storage.local.get([ITEMS_KEY])
        .then((result) => {
            let items = result[ITEMS_KEY] || "";
            if (items) {
                items += "\n";
                items += item;
            } else {
                items = item;
            }

            browser.storage.local.set({[ITEMS_KEY]: items});
        });

}

function sendOptions(tabId, frameId) {
    console.debug("Send items to tab " + tabId + " and frame " + frameId);
    let options = {};
    if (frameId) {
        options.frameId = frameId;
    }

    chainPromises([
        ()       => { return browser.storage.local.get([COMMENT_STRING_KEY, ITEMS_KEY, USE_TAB_KEY]); },
        (result) => { return browser.tabs.sendMessage(tabId, resultToOptions(result), options); },
    ]);
}

function resultToOptions(result) {
    return {
        commentString: result[COMMENT_STRING_KEY] || "",
        itemList: itemStringToList(result[ITEMS_KEY]),
        useTabToChooseItems: result[USE_TAB_KEY],
    };
}

function itemStringToList(itemString) {
    if (!itemString) {
        return [];
    }

    return itemString.split(/\r?\n/).filter(Boolean);
}

function sendOptionsToActiveTab() {
    console.debug("Send items to active tab");
    browser.tabs.query({currentWindow: true, active: true})
        .then((matchingTabs) => { sendOptions(matchingTabs[0].id); });
}

function onUpdated(tabId, changeInfo) {
    if (changeInfo.status == "complete") {
        console.debug("New page loaded, check for inputs");
        chainPromises([
            () => { return browser.tabs.executeScript(tabId, {file: "browser-polyfill.js", allFrames: true}); },
            () => { return browser.tabs.executeScript(tabId, {file: "content-scripts/checker.js", allFrames: true}); },
        ]);
    }
}

function onMessage(message, sender) {
    if (message.text == "refreshAutocomplete") {
        if (message.requireInizialization) {
            console.debug("Background got request to initialize autocompletes");
            initializeAutocomplete(sender.tab.id, sender.frameId);
        } else {
            console.debug("Background got request to refresh autocompletes");
            sendOptions(sender.tab.id, sender.frameId);
        }
    }
}

function initializeAutocomplete(tabId, frameId) {
    console.debug("Initialize autocomplete for tab " + tabId + " and frame " + frameId);
    chainPromises([
        () => { return browser.tabs.executeScript(tabId, {file: "browser-polyfill.js",                  frameId: frameId}); },
        () => { return browser.tabs.executeScript(tabId, {file: "content-scripts/jquery-3.1.1.js",      frameId: frameId}); },
        () => { return browser.tabs.executeScript(tabId, {file: "content-scripts/jquery-ui-1.12.1.js",  frameId: frameId}); },
        () => { return browser.tabs.executeScript(tabId, {file: "content-scripts/autocomplete.js",      frameId: frameId}); },
        () => { return browser.tabs.insertCSS(tabId,     {file: "content-scripts/jquery-ui-1.12.1.css", frameId: frameId}); },
        () => { return browser.tabs.insertCSS(tabId,     {file: "content-scripts/autocomplete.css",     frameId: frameId}); },
        () => { return sendOptions(tabId, frameId); },
    ]);
}

let autocompleteEnabled = false;
function enableDisableAutocomplete(enable) {
    if (enable && !autocompleteEnabled) {
        console.debug("Enable autocomplete");
        browser.tabs.onUpdated.addListener(onUpdated);
        browser.runtime.onMessage.addListener(onMessage);
        browser.tabs.onActivated.addListener(sendOptionsToActiveTab);
        browser.storage.onChanged.addListener(sendOptionsToActiveTab);
        autocompleteEnabled = true;
    } else if (!enable && autocompleteEnabled) {
        console.debug("Disable autocomplete");
        browser.tabs.onUpdated.removeListener(onUpdated);
        browser.runtime.onMessage.removeListener(onMessage);
        browser.tabs.onActivated.removeListener(sendOptionsToActiveTab);
        browser.storage.onChanged.removeListener(sendOptionsToActiveTab);
        autocompleteEnabled = false;
    }
}

browser.storage.onChanged.addListener((changes) => {
    if (changes[ITEMS_KEY]) {
        console.debug("Items updated");
        updateContextMenu(itemStringToList(changes[ITEMS_KEY].newValue));
    }

    if (changes[AUTOCOMPLETE_KEY]) {
        console.debug("Autocomplete setting changed to " + changes[AUTOCOMPLETE_KEY].newValue);
        enableDisableAutocomplete(changes[AUTOCOMPLETE_KEY].newValue);
    }
});

browser.storage.local.get([ITEMS_KEY, AUTOCOMPLETE_KEY])
    .then((result) => {
        updateContextMenu(itemStringToList(result[ITEMS_KEY]));
        enableDisableAutocomplete(result[AUTOCOMPLETE_KEY]);
    });

function chainPromises(functions) {
    let promise = Promise.resolve();
    for (let function_ of functions) {
        promise = promise.then(function_);
    }

    return promise.catch((error) => { console.warn(error.message); });
}
