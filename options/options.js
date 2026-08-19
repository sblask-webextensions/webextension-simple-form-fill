const OPTION_AUTOCOMPLETE_KEY = "autocompleteEnabled";
const OPTION_COMMENT_STRING_KEY = "commentString";
const OPTION_CONTEXTMENU_KEY = "contextmenuEnabled";
const OPTION_ITEMS_KEY = "items";
const OPTION_MATCH_ONLY_AT_BEGINNING = "matchOnlyAtBeginning";
const OPTION_MINIMUM_CHARACTER_COUNT_KEY = "minimumCharacterCount";
const OPTION_SYNC_ITEMS = "syncItems";
const OPTION_USE_TAB_KEY = "useTabToChooseItems";

const ELEMENT_AUTOCOMPLETE_ENABLED = "autocomplete-enabled";
const ELEMENT_COMMENT_STRING = "comment-string";
const ELEMENT_CONTEXTMENU_ENABLED = "contextmenu-enabled";
const ELEMENT_ITEMS = "items";
const ELEMENT_MATCH_ONLY_AT_BEGINNING = "match-only-at-beginning";
const ELEMENT_MINIMUM_CHARACTER_COUNT = "minimum-character-count";
const ELEMENT_SYNC_ITEMS = "sync-items-enabled";
const ELEMENT_USE_TAB_TO_CHOOSE_ITEMS = "use-tab-to-choose-items";

let timeout;

const OPTION_FIELDS = [
    [OPTION_AUTOCOMPLETE_KEY, ELEMENT_AUTOCOMPLETE_ENABLED, setBooleanValue, getBooleanValue],
    [OPTION_COMMENT_STRING_KEY, ELEMENT_COMMENT_STRING, setTextValue, getTextValue],
    [OPTION_CONTEXTMENU_KEY, ELEMENT_CONTEXTMENU_ENABLED, setBooleanValue, getBooleanValue],
    [OPTION_ITEMS_KEY, ELEMENT_ITEMS, setTextValue, getTextValue],
    [OPTION_MATCH_ONLY_AT_BEGINNING, ELEMENT_MATCH_ONLY_AT_BEGINNING, setBooleanValue, getBooleanValue],
    [OPTION_MINIMUM_CHARACTER_COUNT_KEY, ELEMENT_MINIMUM_CHARACTER_COUNT, setTextValue, getNumberValue],
    [OPTION_SYNC_ITEMS, ELEMENT_SYNC_ITEMS, setBooleanValue, getBooleanValue],
    [OPTION_USE_TAB_KEY, ELEMENT_USE_TAB_TO_CHOOSE_ITEMS, setBooleanValue, getBooleanValue],
];

function restoreOptions() {
    browser.storage.local.get(OPTION_FIELDS.map(([key]) => key)).then(
        (result) => {
            for (const [key, elementID, setValueFunction] of OPTION_FIELDS) {
                setValueFunction(elementID, result[key]);
            }
        }
    );
}

function applyStorageChanges(changes, areaName) {
    if (areaName !== "local") {
        return;
    }

    for (const [key, elementID, setValueFunction] of OPTION_FIELDS) {
        if (key in changes) {
            setValueFunction(elementID, changes[key].newValue);
        }
    }
}

function enableAutosave() {
    for (const input of document.querySelectorAll("input:not([type=radio]):not([type=checkbox]), textarea")) {
        input.addEventListener("input", delayedSaveOptions);
    }
    for (const input of document.querySelectorAll("input[type=radio], input[type=checkbox]")) {
        input.addEventListener("change", saveOptions);
    }
}

function setTextValue(elementID, newValue) {
    const oldValue = document.getElementById(elementID).value;

    if (oldValue !== newValue) {
        document.getElementById(elementID).value = newValue;
    }
}

function setBooleanValue(elementID, newValue) {
    document.getElementById(elementID).checked = newValue;
}

function getTextValue(elementID) {
    return document.getElementById(elementID).value;
}

function getNumberValue(elementID) {
    return parseInt(document.getElementById(elementID).value);
}

function getBooleanValue(elementID) {
    return document.getElementById(elementID).checked;
}

function delayedSaveOptions(event) {
    clearTimeout(timeout);
    timeout = setTimeout(saveOptions, 500, event);
}

function saveOptions(event) {
    event.preventDefault();

    const options = {};
    for (const [key, elementID, _setValueFunction, getValueFunction] of OPTION_FIELDS) {
        options[key] = getValueFunction(elementID);
    }
    browser.storage.local.set(options);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.addEventListener("DOMContentLoaded", enableAutosave);
document.querySelector("form").addEventListener("submit", saveOptions);

browser.storage.onChanged.addListener(applyStorageChanges);
