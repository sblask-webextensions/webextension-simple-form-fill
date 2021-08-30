/* global util */

const OPTION_AUTOCOMPLETE_KEY = 'autocompleteEnabled'
const OPTION_COMMENT_STRING_KEY = 'commentString'
const OPTION_ITEMS_KEY = 'items'
const OPTION_MATCH_ONLY_AT_BEGINNING = 'matchOnlyAtBeginning'
const OPTION_MINIMUM_CHARACTER_COUNT_KEY = 'minimumCharacterCount'
const OPTION_SYNC_ITEMS = 'syncItems'
const OPTION_USE_TAB_KEY = 'useTabToChooseItems'

let autocompleteEnabled
let commentString
let itemString
let matchOnlyAtBeginning
let minimumCharacterCount
let syncItems
let useTabToChooseItems

browser.storage.local
    .get([
        OPTION_AUTOCOMPLETE_KEY,
        OPTION_COMMENT_STRING_KEY,
        OPTION_ITEMS_KEY,
        OPTION_MATCH_ONLY_AT_BEGINNING,
        OPTION_MINIMUM_CHARACTER_COUNT_KEY,
        OPTION_SYNC_ITEMS,
        OPTION_USE_TAB_KEY
    ])
    .then(result => {
        if (result[OPTION_ITEMS_KEY] === undefined) {
            browser.storage.local.set({ [OPTION_ITEMS_KEY]: '' })
        } else {
            itemString = result[OPTION_ITEMS_KEY]
        }

        if (result[OPTION_AUTOCOMPLETE_KEY] === undefined) {
            browser.storage.local.set({ [OPTION_AUTOCOMPLETE_KEY]: true })
        } else {
            enableDisableAutocomplete(result[OPTION_AUTOCOMPLETE_KEY])
        }

        if (result[OPTION_USE_TAB_KEY] === undefined) {
            browser.storage.local.set({ [OPTION_USE_TAB_KEY]: false })
        } else {
            useTabToChooseItems = result[OPTION_USE_TAB_KEY]
        }

        if (result[OPTION_MATCH_ONLY_AT_BEGINNING] === undefined) {
            browser.storage.local.set({
                [OPTION_MATCH_ONLY_AT_BEGINNING]: false
            })
        } else {
            matchOnlyAtBeginning = result[OPTION_MATCH_ONLY_AT_BEGINNING]
        }

        if (result[OPTION_COMMENT_STRING_KEY] === undefined) {
            browser.storage.local.set({ [OPTION_COMMENT_STRING_KEY]: '' })
        } else {
            commentString = result[OPTION_COMMENT_STRING_KEY]
        }

        if (result[OPTION_MINIMUM_CHARACTER_COUNT_KEY] === undefined) {
            browser.storage.local.set({
                [OPTION_MINIMUM_CHARACTER_COUNT_KEY]: 1
            })
        } else {
            minimumCharacterCount = result[OPTION_MINIMUM_CHARACTER_COUNT_KEY]
        }

        if (result[OPTION_SYNC_ITEMS] === undefined) {
            browser.storage.local.set({ [OPTION_SYNC_ITEMS]: false })
        } else {
            syncItems = result[OPTION_SYNC_ITEMS]
        }
    })

browser.storage.onChanged.addListener((changes, areaName) => {
    let initTriggered = false
    if (changes[OPTION_SYNC_ITEMS]) {
        const previousValue = syncItems
        const newValue = changes[OPTION_SYNC_ITEMS].newValue
        syncItems = newValue
        if (previousValue !== newValue && syncItems) {
            initTriggered = true
            initSyncItems()
        }
    }

    if (changes[OPTION_ITEMS_KEY]) {
        itemString = changes[OPTION_ITEMS_KEY].newValue
        if (!initTriggered) {
            maybeSyncItems(areaName, itemString)
        }
    }

    if (changes[OPTION_AUTOCOMPLETE_KEY]) {
        enableDisableAutocomplete(changes[OPTION_AUTOCOMPLETE_KEY].newValue)
    }

    if (changes[OPTION_USE_TAB_KEY]) {
        useTabToChooseItems = changes[OPTION_USE_TAB_KEY].newValue
    }

    if (changes[OPTION_MATCH_ONLY_AT_BEGINNING]) {
        matchOnlyAtBeginning = changes[OPTION_MATCH_ONLY_AT_BEGINNING].newValue
    }

    if (changes[OPTION_COMMENT_STRING_KEY]) {
        commentString = changes[OPTION_COMMENT_STRING_KEY].newValue
    }

    if (changes[OPTION_MINIMUM_CHARACTER_COUNT_KEY]) {
        minimumCharacterCount =
            changes[OPTION_MINIMUM_CHARACTER_COUNT_KEY].newValue
    }

    if (autocompleteEnabled) {
        sendOptionsToActiveTab()
    }
})

function addItem (item) {
    if (itemString) {
        itemString += '\n'
        itemString += item
    } else {
        itemString = item
    }

    browser.storage.local.set({ [OPTION_ITEMS_KEY]: itemString })
}

function sendOptions (tabId, frameId) {
    console.debug('Send items to tab ' + tabId + ' and frame ' + frameId)
    const options = {}
    if (frameId) {
        options.frameId = frameId
    }

    browser.tabs.sendMessage(
        tabId,
        {
            commentString,
            itemList: itemStringToList(itemString),
            useTabToChooseItems,
            minimumCharacterCount,
            matchOnlyAtBeginning
        },
        options
    )
}

function itemStringToList (itemString) {
    if (!itemString) {
        return []
    }

    return itemString.split(/\r?\n/).filter(Boolean)
}

function sendOptionsToActiveTab () {
    console.debug('Send items to active tab')
    browser.tabs
        .query({ currentWindow: true, active: true })
        .then(matchingTabs => {
            sendOptions(matchingTabs[0].id)
        })
}

function onUpdated (tabId, changeInfo) {
    if (changeInfo.status == 'complete') {
        console.debug('New page loaded, check for inputs')
        chainPromises([
            () => {
                return browser.tabs.executeScript(tabId, {
                    file: 'browser-polyfill.js',
                    allFrames: true
                })
            },
            () => {
                return browser.tabs.executeScript(tabId, {
                    file: 'content-scripts/checker.js',
                    allFrames: true
                })
            }
        ])
    }
}

function onMessage (message, sender) {
    if (message.text == 'refreshAutocomplete') {
        if (message.requireInizialization) {
            console.debug('Background got request to initialize autocompletes')
            initializeAutocomplete(sender.tab.id, sender.frameId)
        } else {
            console.debug('Background got request to refresh autocompletes')
            sendOptions(sender.tab.id, sender.frameId)
        }
    }
}

function initializeAutocomplete (tabId, frameId) {
    console.debug(
        'Initialize autocomplete for tab ' + tabId + ' and frame ' + frameId
    )
    chainPromises([
        () => {
            return browser.tabs.executeScript(tabId, {
                file: 'browser-polyfill.js',
                frameId: frameId
            })
        },
        () => {
            return browser.tabs.executeScript(tabId, {
                file: 'content-scripts/jquery-3.1.1.js',
                frameId: frameId
            })
        },
        () => {
            return browser.tabs.executeScript(tabId, {
                file: 'content-scripts/jquery-ui-1.12.1.js',
                frameId: frameId
            })
        },
        () => {
            return browser.tabs.executeScript(tabId, {
                file: 'content-scripts/autocomplete.js',
                frameId: frameId
            })
        },
        () => {
            return browser.tabs.insertCSS(tabId, {
                file: 'content-scripts/autocomplete.css',
                frameId: frameId
            })
        },
        () => {
            return sendOptions(tabId, frameId)
        }
    ])
}

function enableDisableAutocomplete (enable) {
    if (enable && !autocompleteEnabled) {
        console.debug('Enable autocomplete')
        browser.tabs.onUpdated.addListener(onUpdated)
        browser.runtime.onMessage.addListener(onMessage)
        browser.tabs.onActivated.addListener(sendOptionsToActiveTab)
        autocompleteEnabled = true
    } else if (!enable && autocompleteEnabled) {
        console.debug('Disable autocomplete')
        browser.tabs.onUpdated.removeListener(onUpdated)
        browser.runtime.onMessage.removeListener(onMessage)
        browser.tabs.onActivated.removeListener(sendOptionsToActiveTab)
        autocompleteEnabled = false
    }
}

function initSyncItems () {
    Promise.all([
        browser.storage.local.get(OPTION_ITEMS_KEY),
        browser.storage.sync.get(OPTION_ITEMS_KEY)
    ]).then(([localResult, remoteResult]) => {
        const localValue = localResult[OPTION_ITEMS_KEY]
        const remoteValue = remoteResult[OPTION_ITEMS_KEY]
        const newValue = util.mergeItemString(localValue, remoteValue)

        if (JSON.stringify(localValue) != JSON.stringify(newValue)) {
            browser.storage.local.set({ [OPTION_ITEMS_KEY]: newValue })
        }
        if (JSON.stringify(remoteValue) != JSON.stringify(newValue)) {
            browser.storage.sync.set({ [OPTION_ITEMS_KEY]: newValue })
        }
    })
}

function maybeSyncItems (changedArea, itemString) {
    if (!syncItems) {
        return
    }

    const toAreaName = changedArea === 'local' ? 'sync' : 'local'
    const toArea = browser.storage[toAreaName]

    toArea.get([OPTION_ITEMS_KEY]).then(result => {
        const targetItemString = result[OPTION_ITEMS_KEY]
        if (targetItemString !== itemString) {
            toArea.set({ [OPTION_ITEMS_KEY]: itemString })
        }
    })
}

function chainPromises (functions) {
    let promise = Promise.resolve()
    for (const function_ of functions) {
        promise = promise.then(function_)
    }

    return promise.catch(error => {
        console.warn(error.message, error.stack)
    })
}
