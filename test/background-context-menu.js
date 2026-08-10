import test from "tape";

import * as util from "../util.js";

const DEFAULT_OPTIONS = {
    autocompleteEnabled: false,
    commentString: "",
    contextmenuEnabled: true,
    items: "",
    matchOnlyAtBeginning: false,
    minimumCharacterCount: 1,
    syncItems: false,
    useTabToChooseItems: false,
};

const DOCUMENT_URL_PATTERNS = [
    "file:///*",
    "http://*/*",
    "https://*/*",
];

let importIndex = 0;

async function createHarness(optionOverrides = {}) {
    const calls = {
        createdMenus: [],
        localSet: [],
        openOptionsPage: 0,
        removeAll: 0,
        sentMessages: [],
    };
    const listeners = {};
    const localStorage = {
        ...DEFAULT_OPTIONS,
        ...optionOverrides,
    };
    const syncStorage = {};

    function getStoredValues(storage, keys) {
        const keyList = typeof keys === "string" ? [keys] : keys;
        return Object.fromEntries(
            keyList
                .filter((key) => storage[key] !== undefined)
                .map((key) => [key, storage[key]])
        );
    }

    globalThis.browser = {
        contextMenus: {
            create(properties, callback) {
                calls.createdMenus.push(properties);
                callback();
            },
            onClicked: {
                addListener(listener) {
                    listeners.contextMenuClicked = listener;
                },
            },
            async removeAll() {
                calls.createdMenus = [];
                calls.removeAll += 1;
            },
        },
        runtime: {
            id: "simple-form-fill-test",
            lastError: undefined,
            onInstalled: {
                addListener(listener) {
                    listeners.installed = listener;
                },
            },
            onMessage: {
                addListener(listener) {
                    listeners.message = listener;
                },
            },
            openOptionsPage() {
                calls.openOptionsPage += 1;
            },
        },
        scripting: {
            executeScript() {
                return Promise.resolve();
            },
            insertCSS() {
                return Promise.resolve();
            },
        },
        storage: {
            local: {
                get(keys) {
                    return Promise.resolve(getStoredValues(localStorage, keys));
                },
                set(values) {
                    Object.assign(localStorage, values);
                    calls.localSet.push(values);
                    return Promise.resolve();
                },
            },
            onChanged: {
                addListener(listener) {
                    listeners.storageChanged = listener;
                },
            },
            sync: {
                get(keys) {
                    return Promise.resolve(getStoredValues(syncStorage, keys));
                },
                set(values) {
                    Object.assign(syncStorage, values);
                    return Promise.resolve();
                },
            },
        },
        tabs: {
            onActivated: {
                addListener(listener) {
                    listeners.tabActivated = listener;
                },
            },
            query() {
                return Promise.resolve([]);
            },
            sendMessage(...parameters) {
                calls.sentMessages.push(parameters);
                return Promise.resolve();
            },
        },
    };

    importIndex += 1;
    await import(`../background.js?context-menu-test=${importIndex}`);
    await listeners.installed();

    return {
        calls,
        listeners,
        localStorage,
    };
}

test("context menu creates its fixed and configured items", async function(assert) {
    const {calls} = await createHarness({
        commentString: " # ",
        items: "Alpha # comment\n\nBeta",
    });

    assert.equal(calls.removeAll, 1, "removes stale menu items first");
    assert.deepEqual(
        calls.createdMenus.map(({id}) => id),
        ["root", "preferences", "add-selection", "separator", "item:0", "item:1"],
        "creates stable IDs and ignores empty item lines"
    );
    assert.deepEqual(
        calls.createdMenus.slice(-2).map(({title}) => title),
        ["Alpha # comment", "Beta"],
        "uses configured item text as titles"
    );
    for (const menu of calls.createdMenus) {
        assert.deepEqual(
            menu.documentUrlPatterns,
            DOCUMENT_URL_PATTERNS,
            `${menu.id} supports file, HTTP, and HTTPS pages`
        );
    }
    assert.deepEqual(
        calls.createdMenus[0].contexts,
        ["page", "frame", "selection", "editable"],
        "shows the root in every supported context"
    );
    assert.deepEqual(
        calls.createdMenus.at(-1).contexts,
        ["editable"],
        "shows configured items only for editable elements"
    );
    assert.end();
});

test("context menu follows the enabled option", async function(assert) {
    const {calls, listeners} = await createHarness({contextmenuEnabled: false});

    assert.equal(calls.createdMenus.length, 0, "does not create items while disabled");
    await listeners.storageChanged({
        contextmenuEnabled: {
            newValue: true,
            oldValue: false,
        },
    }, "local");
    assert.deepEqual(
        calls.createdMenus.map(({id}) => id),
        ["root", "preferences", "add-selection"],
        "creates the fixed menu when enabled"
    );

    await listeners.storageChanged({
        contextmenuEnabled: {
            newValue: false,
            oldValue: true,
        },
    }, "local");
    assert.equal(calls.removeAll, 3, "removes the menu again when disabled");
    assert.end();
});

test("context menu rebuilds indexed items when options change", async function(assert) {
    const {calls, listeners} = await createHarness({items: "Alpha"});

    assert.deepEqual(
        calls.createdMenus.map(({id}) => id),
        ["root", "preferences", "add-selection", "separator", "item:0"],
        "creates an item ID from the passed item"
    );
    assert.deepEqual(
        calls.createdMenus.slice(-1).map(({title}) => title),
        ["Alpha"],
        "uses the title of the passed item"
    );

    await listeners.storageChanged({
        items: {
            newValue: "Beta\nGamma",
            oldValue: "Alpha",
        },
    }, "local");

    assert.deepEqual(
        calls.createdMenus.map(({id}) => id),
        ["root", "preferences", "add-selection", "separator", "item:0", "item:1"],
        "recreates item IDs from the new list"
    );
    assert.deepEqual(
        calls.createdMenus.slice(-2).map(({title}) => title),
        ["Beta", "Gamma"],
        "uses the updated item titles"
    );
    assert.equal(calls.removeAll, 2, "removes the previous menu before rebuilding");
    assert.end();
});

test("context menu item clicks target the requested tab and frame", async function(assert) {
    const {calls, listeners} = await createHarness({
        commentString: " # ",
        items: "Alpha # comment\nBeta",
    });

    await listeners.contextMenuClicked({
        frameId: 7,
        menuItemId: "item:0",
    }, {id: 42});
    assert.deepEqual(
        calls.sentMessages,
        [[
            42,
            {
                item: "Alpha",
                type: "insert-item",
            },
            {frameId: 7},
        ]],
        "sends the cleaned item to the clicked frame"
    );

    for (const menuItemId of ["item:-1", "item:01", "item:2", "unknown", 0]) {
        await listeners.contextMenuClicked({menuItemId}, {id: 42});
    }
    assert.equal(calls.sentMessages.length, 1, "ignores invalid and stale item IDs");
    assert.end();
});

test("context menu item clicks format strftime items using the current date", async function(assert) {
    const {calls, listeners} = await createHarness({
        commentString: " # ",
        items: "%Y-%m-%d # strftime today\nBeta",
    });

    await listeners.contextMenuClicked({
        frameId: 7,
        menuItemId: "item:0",
    }, {id: 42});

    assert.deepEqual(
        calls.sentMessages,
        [[
            42,
            {
                item: util.strftime("%Y-%m-%d"),
                type: "insert-item",
            },
            {frameId: 7},
        ]],
        "resolves the format string against the current date before inserting"
    );
    assert.end();
});

test("autocomplete item list keeps strftime format strings as they are", async function(assert) {
    const {calls, listeners} = await createHarness({
        autocompleteEnabled: true,
        commentString: " # ",
        items: "%Y-%m-%d # strftime today\nBeta",
    });

    await listeners.message(
        {requireInizialization: false, type: "refresh-autocomplete"},
        {id: "simple-form-fill-test", tab: {active: true, id: 42}},
    );

    const [, message] = calls.sentMessages.at(-1);
    assert.deepEqual(
        message.itemList,
        ["%Y-%m-%d # strftime today", "Beta"],
        "does not format string"
    );
    assert.end();
});

test("fixed context menu actions open preferences and append selections", async function(assert) {
    const {calls, listeners, localStorage} = await createHarness({items: "Alpha"});

    await listeners.contextMenuClicked({menuItemId: "preferences"}, {id: 42});
    assert.equal(calls.openOptionsPage, 1, "opens the extension preferences");

    await listeners.contextMenuClicked({
        menuItemId: "add-selection",
        selectionText: "Beta",
    }, {id: 42});
    assert.equal(localStorage.items, "Alpha\nBeta", "appends selected text to stored items");
    assert.deepEqual(calls.localSet.at(-1), {items: "Alpha\nBeta"}, "persists the new item list");
    assert.end();
});
