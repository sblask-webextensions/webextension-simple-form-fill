"use strict";

const ITEMS_KEY = "items";
const AUTOCOMPLETE_KEY = "autocompleteEnabled";
const USE_TAB_KEY = "useTabToChooseItems";
const MATCH_ONLY_AT_BEGINNING = "matchOnlyAtBeginning";
const COMMENT_STRING_KEY = "commentString";
const MINIMUM_CHARACTER_COUNT_KEY = "minimumCharacterCount";

const CONTEXT_MENU_ROOT_ID = "root";
const CONTEXT_MENU_PREFERENCES_ID = "preferences";
const CONTEXT_MENU_SEPARATOR_ID = "separator";
const CONTEXT_MENU_ADD_SELECTION_ID = "add-selection";

let itemString = undefined;
let autocompleteEnabled = undefined;
let useTabToChooseItems = undefined;
let matchOnlyAtBeginning = undefined;
let commentString = undefined;
let minimumCharacterCount = undefined;

browser.storage.local.get([
    ITEMS_KEY,
    AUTOCOMPLETE_KEY,
    USE_TAB_KEY,
    MATCH_ONLY_AT_BEGINNING,
    COMMENT_STRING_KEY,
    MINIMUM_CHARACTER_COUNT_KEY,
])
    .then(
        (result) => {

            if (result[ITEMS_KEY] === undefined) {
                browser.storage.local.set({[ITEMS_KEY]: ""});
            } else {
                itemString = result[ITEMS_KEY];
                updateContextMenu(itemStringToList(itemString));
            }

            if (result[AUTOCOMPLETE_KEY] === undefined) {
                browser.storage.local.set({[AUTOCOMPLETE_KEY]: false});
            } else {
                enableDisableAutocomplete(result[AUTOCOMPLETE_KEY]);
            }

            if (result[USE_TAB_KEY] === undefined) {
                browser.storage.local.set({[USE_TAB_KEY]: false});
            } else {
                useTabToChooseItems = result[USE_TAB_KEY];
            }

            if (result[MATCH_ONLY_AT_BEGINNING] === undefined) {
                browser.storage.local.set({[MATCH_ONLY_AT_BEGINNING]: false});
            } else {
                matchOnlyAtBeginning = result[MATCH_ONLY_AT_BEGINNING];
            }

            if (result[COMMENT_STRING_KEY] === undefined) {
                browser.storage.local.set({[COMMENT_STRING_KEY]: ""});
            } else {
                commentString = result[COMMENT_STRING_KEY];
            }

            if (result[MINIMUM_CHARACTER_COUNT_KEY] === undefined) {
                browser.storage.local.set({[MINIMUM_CHARACTER_COUNT_KEY]: 1});
            } else {
                minimumCharacterCount = result[MINIMUM_CHARACTER_COUNT_KEY];
            }

        }
    );

browser.storage.onChanged.addListener(
    (changes) => {

        if (changes[ITEMS_KEY]) {
            itemString = changes[ITEMS_KEY].newValue;
            updateContextMenu(itemStringToList(itemString));
        }

        if (changes[AUTOCOMPLETE_KEY]) {
            enableDisableAutocomplete(changes[AUTOCOMPLETE_KEY].newValue);
        }

        if (changes[USE_TAB_KEY]) {
            useTabToChooseItems = changes[USE_TAB_KEY].newValue;
        }

        if (changes[MATCH_ONLY_AT_BEGINNING]) {
            matchOnlyAtBeginning = changes[MATCH_ONLY_AT_BEGINNING].newValue;
        }

        if (changes[COMMENT_STRING_KEY]) {
            commentString = changes[COMMENT_STRING_KEY].newValue;
        }

        if (changes[MINIMUM_CHARACTER_COUNT_KEY]) {
            minimumCharacterCount = changes[MINIMUM_CHARACTER_COUNT_KEY].newValue;
        }

        if (autocompleteEnabled) {
            sendOptionsToActiveTab();
        }

    }
);

function updateContextMenu(items) {
    browser.contextMenus.removeAll().then(() => fillContextMenu(items));
}

function fillContextMenu(items) {
    browser.contextMenus.create({
        id: CONTEXT_MENU_ROOT_ID,
        title: "Simple Form Fill",
        contexts: ["page", "frame", "selection", "editable"],
    });
    browser.contextMenus.create({
        id: CONTEXT_MENU_PREFERENCES_ID,
        parentId: CONTEXT_MENU_ROOT_ID,
        title: "Preferences",
        contexts: ["page", "frame", "selection", "editable"],
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
                ()            => { return browser.tabs.executeScript(tab.id, {file: "browser-polyfill.js", allFrames: true}); },
                ()            => { return browser.tabs.executeScript(tab.id, {file: "content-scripts/insert-item.js", allFrames: true}); },
                ()            => { return commentString ? info.menuItemId.split(commentString)[0] : info.menuItemId; },
                (cleanedItem) => { return browser.tabs.sendMessage(tab.id, {item: cleanedItem}); },
            ]);

    }
});

function addItem(item) {
    if (itemString) {
        itemString += "\n";
        itemString += item;
    } else {
        itemString = item;
    }

    browser.storage.local.set({[ITEMS_KEY]: itemString});
}

function sendOptions(tabId, frameId) {
    console.debug("Send items to tab " + tabId + " and frame " + frameId);
    let options = {};
    if (frameId) {
        options.frameId = frameId;
    }

    browser.tabs.sendMessage(
        tabId,
        {
            commentString,
            itemList: itemStringToList(itemString),
            useTabToChooseItems,
            minimumCharacterCount,
            matchOnlyAtBeginning,
        },
        options
    );
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
        () => { return browser.tabs.insertCSS(tabId,     {file: "content-scripts/autocomplete.css",     frameId: frameId}); },
        () => { return sendOptions(tabId, frameId); },
    ]);
}

function enableDisableAutocomplete(enable) {
    if (enable && !autocompleteEnabled) {
        console.debug("Enable autocomplete");
        browser.tabs.onUpdated.addListener(onUpdated);
        browser.runtime.onMessage.addListener(onMessage);
        browser.tabs.onActivated.addListener(sendOptionsToActiveTab);
        autocompleteEnabled = true;
    } else if (!enable && autocompleteEnabled) {
        console.debug("Disable autocomplete");
        browser.tabs.onUpdated.removeListener(onUpdated);
        browser.runtime.onMessage.removeListener(onMessage);
        browser.tabs.onActivated.removeListener(sendOptionsToActiveTab);
        autocompleteEnabled = false;
    }
}

function chainPromises(functions) {
    let promise = Promise.resolve();
    for (let function_ of functions) {
        promise = promise.then(function_);
    }

    return promise.catch((error) => { console.warn(error.message, error.stack); });
}
