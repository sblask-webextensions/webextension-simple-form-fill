import * as util from "./util.js";

const OPTION_AUTOCOMPLETE_KEY = "autocompleteEnabled";
const OPTION_COMMENT_STRING_KEY = "commentString";
const OPTION_CONTEXTMENU_KEY = "contextmenuEnabled";
const OPTION_ITEMS_KEY = "items";
const OPTION_MATCH_ONLY_AT_BEGINNING = "matchOnlyAtBeginning";
const OPTION_MINIMUM_CHARACTER_COUNT_KEY = "minimumCharacterCount";
const OPTION_SYNC_ITEMS = "syncItems";
const OPTION_USE_TAB_KEY = "useTabToChooseItems";

const CONTEXT_MENU_ROOT_ID = "root";
const CONTEXT_MENU_PREFERENCES_ID = "preferences";
const CONTEXT_MENU_SEPARATOR_ID = "separator";
const CONTEXT_MENU_ADD_SELECTION_ID = "add-selection";
const CONTEXT_MENU_ITEM_ID_PREFIX = "item:";

const CONTENT_SCRIPT_DOCUMENT_URL_PATTERNS = [
    "http://*/*",
    "https://*/*",
];

let autocompleteEnabled;
let commentString;
let contextMenuEnabled;
let itemString;
let matchOnlyAtBeginning;
let minimumCharacterCount;
let syncItems;
let useTabToChooseItems;

let contextMenuPromise;
const optionsInitialization = initializeOptions();

async function initializeOptions() {
    const defaults = {
        [OPTION_AUTOCOMPLETE_KEY]: false,
        [OPTION_COMMENT_STRING_KEY]: "",
        [OPTION_CONTEXTMENU_KEY]: true,
        [OPTION_ITEMS_KEY]: "",
        [OPTION_MATCH_ONLY_AT_BEGINNING]: false,
        [OPTION_MINIMUM_CHARACTER_COUNT_KEY]: 1,
        [OPTION_SYNC_ITEMS]: false,
        [OPTION_USE_TAB_KEY]: false,
    };

    const stored = await browser.storage.local.get(Object.keys(defaults));
    const options = {...defaults, ...stored};

    autocompleteEnabled = options[OPTION_AUTOCOMPLETE_KEY];
    commentString = options[OPTION_COMMENT_STRING_KEY];
    contextMenuEnabled = options[OPTION_CONTEXTMENU_KEY];
    itemString = options[OPTION_ITEMS_KEY];
    matchOnlyAtBeginning = options[OPTION_MATCH_ONLY_AT_BEGINNING];
    minimumCharacterCount = options[OPTION_MINIMUM_CHARACTER_COUNT_KEY];
    syncItems = options[OPTION_SYNC_ITEMS];
    useTabToChooseItems = options[OPTION_USE_TAB_KEY];

    const missingDefaults = Object.fromEntries(
        Object.entries(defaults).filter(([key]) => stored[key] === undefined)
    );
    if (Object.keys(missingDefaults).length > 0) {
        await browser.storage.local.set(missingDefaults);
    }
}

function optionsChanged(changes, areaName) {
    let autocompleteChanged = false;
    let initTriggered = false;
    let contextMenuChanged = false;
    if (changes[OPTION_SYNC_ITEMS]) {
        const previousValue = syncItems;
        const newValue = changes[OPTION_SYNC_ITEMS].newValue;
        syncItems = newValue;
        if (previousValue !== newValue && syncItems) {
            initTriggered = true;
            initSyncItems();
        }
    }

    if (changes[OPTION_ITEMS_KEY]) {
        itemString = changes[OPTION_ITEMS_KEY].newValue;
        contextMenuChanged = true;
        if (!initTriggered) {
            maybeSyncItems(areaName, itemString);
        }
    }

    if (changes[OPTION_CONTEXTMENU_KEY]) {
        contextMenuEnabled = changes[OPTION_CONTEXTMENU_KEY].newValue;
        contextMenuChanged = true;
    }

    if (changes[OPTION_AUTOCOMPLETE_KEY]) {
        autocompleteEnabled = (changes[OPTION_AUTOCOMPLETE_KEY].newValue);
        autocompleteChanged = true;
    }

    if (changes[OPTION_USE_TAB_KEY]) {
        useTabToChooseItems = changes[OPTION_USE_TAB_KEY].newValue;
    }

    if (changes[OPTION_MATCH_ONLY_AT_BEGINNING]) {
        matchOnlyAtBeginning = changes[OPTION_MATCH_ONLY_AT_BEGINNING].newValue;
    }

    if (changes[OPTION_COMMENT_STRING_KEY]) {
        commentString = changes[OPTION_COMMENT_STRING_KEY].newValue;
    }

    if (changes[OPTION_MINIMUM_CHARACTER_COUNT_KEY]) {
        minimumCharacterCount = changes[OPTION_MINIMUM_CHARACTER_COUNT_KEY].newValue;
    }

    return {autocompleteChanged, contextMenuChanged};
}

browser.storage.onChanged.addListener(async (changes, areaName) => {
    await optionsInitialization;
    const {autocompleteChanged, contextMenuChanged} = optionsChanged(changes, areaName);
    if (autocompleteChanged) {
        if (autocompleteEnabled) {
            await updateAutocompleteStatusInActiveTab();
        } else {
            await updateAutocompleteStatusInOpenTabs();
        }
    } else if (autocompleteEnabled) {
        await updateAutocompleteOptionsInActiveTab();
    }
    if (contextMenuChanged) {
        await updateContextMenu();
    }
});

browser.runtime.onInstalled.addListener(async () => {
    await optionsInitialization;
    await updateContextMenu();
});
browser.runtime.onMessage.addListener(onMessage);

async function onMessage(message, sender) {
    if (
        sender.id !== browser.runtime.id
        || !sender.tab
    ) {
        return false;
    }

    try {
        await optionsInitialization;
        if (message?.type === "get-autocomplete-status") {
            return autocompleteEnabled && sender.tab.active;
        }
        if (message?.type !== "refresh-autocomplete") {
            return false;
        }
        if (!autocompleteEnabled) {
            return false;
        }

        if (message.requireInizialization) {
            console.debug("Background got request to initialize autocompletes");
            await initializeAutocomplete(sender.tab.id, sender.frameId);
        }
        console.debug("Background got request to refresh autocompletes");
        await updateAutocompleteOptions(sender.tab.id, sender.frameId);
        return true;
    } catch (error) {
        console.warn(error.message, error.stack);
        return false;
    }
}

browser.tabs.onActivated.addListener(onTabActivated);

async function onTabActivated({tabId}) {
    await optionsInitialization;
    if (!autocompleteEnabled) {
        return;
    }

    await updateAutocompleteStatusInTab(tabId);
}

function updateContextMenu() {
    contextMenuPromise = (contextMenuPromise ?? Promise.resolve()).then(doUpdateContextMenu);
    return contextMenuPromise;
}

async function doUpdateContextMenu() {
    try {
        await browser.contextMenus.removeAll();
        await maybeFillContextMenu();
    } catch (error) {
        console.warn(error.message, error.stack);
    }
}

function createContextMenu(properties) {
    return new Promise((resolve, reject) => {
        browser.contextMenus.create(properties, () => {
            const error = browser.runtime.lastError;
            if (error) {
                reject(new Error(error.message));
            } else {
                resolve();
            }
        });
    });
}

async function maybeFillContextMenu() {
    if (!contextMenuEnabled) {
        return;
    }

    await createContextMenu({
        id: CONTEXT_MENU_ROOT_ID,
        title: "Simple Form Fill",
        contexts: ["page", "frame", "selection", "editable"],
        documentUrlPatterns: CONTENT_SCRIPT_DOCUMENT_URL_PATTERNS,
    });
    await createContextMenu({
        id: CONTEXT_MENU_PREFERENCES_ID,
        parentId: CONTEXT_MENU_ROOT_ID,
        title: "Preferences",
        contexts: ["page", "frame", "selection", "editable"],
        documentUrlPatterns: CONTENT_SCRIPT_DOCUMENT_URL_PATTERNS,
    });
    await createContextMenu({
        id: CONTEXT_MENU_ADD_SELECTION_ID,
        parentId: CONTEXT_MENU_ROOT_ID,
        title: "Add '%s'",
        contexts: ["selection"],
        documentUrlPatterns: CONTENT_SCRIPT_DOCUMENT_URL_PATTERNS,
    });

    const items = itemStringToList(itemString);
    if (items.length > 0) {
        await createContextMenu({
            id: CONTEXT_MENU_SEPARATOR_ID,
            parentId: CONTEXT_MENU_ROOT_ID,
            type: "separator",
            contexts: ["editable"],
            documentUrlPatterns: CONTENT_SCRIPT_DOCUMENT_URL_PATTERNS,
        });
        for (const [index, item] of items.entries()) {
            await createContextMenu({
                id: CONTEXT_MENU_ITEM_ID_PREFIX + index,
                parentId: CONTEXT_MENU_ROOT_ID,
                title: item,
                contexts: ["editable"],
                documentUrlPatterns: CONTENT_SCRIPT_DOCUMENT_URL_PATTERNS,
            });
        }
    }
}

browser.contextMenus.onClicked.addListener(async (info, tab) => {
    await optionsInitialization;

    switch (info.menuItemId) {
        case CONTEXT_MENU_PREFERENCES_ID:
            browser.runtime.openOptionsPage();
            break;
        case CONTEXT_MENU_ADD_SELECTION_ID:
            addItem(info.selectionText);
            break;
        default: {
            const item = getContextMenuItem(info.menuItemId);
            if (item === undefined) {
                return;
            }
            const cleanedItem = commentString ? item.split(commentString)[0] : item;
            browser.tabs.sendMessage(
                tab.id,
                {
                    type: "insert-item",
                    item: cleanedItem,
                },
                {
                    frameId: info.frameId,
                }
            ).catch((error) => {
                console.warn(error.message, error.stack);
            });
        }
    }
});

function getContextMenuItem(menuItemId) {
    if (typeof menuItemId !== "string" || !menuItemId.startsWith(CONTEXT_MENU_ITEM_ID_PREFIX)) {
        return undefined;
    }

    const indexString = menuItemId.slice(CONTEXT_MENU_ITEM_ID_PREFIX.length);
    if (!/^(0|[1-9]\d*)$/.test(indexString)) {
        return undefined;
    }

    return itemStringToList(itemString)[Number(indexString)];
}

function addItem(item) {
    if (itemString) {
        itemString += "\n";
        itemString += item;
    } else {
        itemString = item;
    }

    browser.storage.local.set({[OPTION_ITEMS_KEY]: itemString});
}

async function updateAutocompleteOptionsInActiveTab() {
    console.debug("Send items to active tab");
    try {
        const matchingTabs = await browser.tabs.query({currentWindow: true, active: true});
        await updateAutocompleteOptions(matchingTabs[0].id);
    } catch (error) {
        console.warn(error.message, error.stack);
    }
}

function updateAutocompleteOptions(tabId, frameId) {
    console.debug("Send items to tab " + tabId + " and frame " + frameId);
    const options = {};
    if (frameId !== undefined) {
        options.frameId = frameId;
    }

    return browser.tabs.sendMessage(
        tabId,
        {
            type: "update-autocomplete-options",
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

async function updateAutocompleteStatusInOpenTabs() {
    const tabs = await browser.tabs.query({url: "<all_urls>"});
    await Promise.all(tabs.map((tab) => updateAutocompleteStatusInTab(tab.id)));
}

async function updateAutocompleteStatusInActiveTab() {
    try {
        const tabs = await browser.tabs.query({currentWindow: true, active: true});
        await updateAutocompleteStatusInTab(tabs[0].id);
    } catch (error) {
        console.warn(error.message, error.stack);
    }
}

async function updateAutocompleteStatusInTab(tabId) {
    try {
        await browser.tabs.sendMessage(tabId, {
            type: "update-autocomplete-status",
            enabled: autocompleteEnabled,
        });
    } catch (error) {
        console.warn(error.message, error.stack);
    }
}

async function initializeAutocomplete(tabId, frameId) {
    console.debug("Initialize autocomplete for tab " + tabId + " and frame " + frameId);
    const target = {
        tabId,
        frameIds: [frameId],
    };

    await browser.scripting.executeScript({
        target,
        files: [
            "content-scripts/jquery-3.1.1.js",
            "content-scripts/jquery-ui-1.12.1.js",
            "content-scripts/autocomplete.js",
        ],
    });
    await browser.scripting.insertCSS({
        target,
        files: ["content-scripts/autocomplete.css"],
    });
}

function initSyncItems() {
    Promise.all([
        browser.storage.local.get(OPTION_ITEMS_KEY),
        browser.storage.sync.get(OPTION_ITEMS_KEY),
    ])
        .then(
            ([localResult, remoteResult]) => {
                const localValue = localResult[OPTION_ITEMS_KEY];
                const remoteValue = remoteResult[OPTION_ITEMS_KEY];
                const newValue = util.mergeItemString(localValue, remoteValue);

                if (JSON.stringify(localValue) != JSON.stringify(newValue)) {
                    browser.storage.local.set({[OPTION_ITEMS_KEY]: newValue});
                }
                if (JSON.stringify(remoteValue) != JSON.stringify(newValue)) {
                    browser.storage.sync.set({[OPTION_ITEMS_KEY]: newValue});
                }
            }
        );
}

function maybeSyncItems(changedArea, itemString) {
    if (!syncItems) {
        return;
    }

    const toAreaName = changedArea === "local" ? "sync" : "local";
    const toArea = browser.storage[toAreaName];

    toArea.get([OPTION_ITEMS_KEY]).then(
        (result) => {
            const targetItemString = result[OPTION_ITEMS_KEY];
            if (targetItemString !== itemString) {
                toArea.set({[OPTION_ITEMS_KEY]: itemString});
            }
        }
    );
}
