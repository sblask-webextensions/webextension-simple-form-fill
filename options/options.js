const OPTION_ITEMS_KEY = "items";
const OPTION_CONTEXTMENU_KEY = "contextmenuEnabled";
const OPTION_AUTOCOMPLETE_KEY = "autocompleteEnabled";
const OPTION_USE_TAB_KEY = "useTabToChooseItems";
const OPTION_MATCH_ONLY_AT_BEGINNING = "matchOnlyAtBeginning";
const OPTION_COMMENT_STRING_KEY = "commentString";
const OPTION_MINIMUM_CHARACTER_COUNT_KEY = "minimumCharacterCount";

function restoreOptions() {
    browser.storage.local.get([
        OPTION_ITEMS_KEY,
        OPTION_CONTEXTMENU_KEY,
        OPTION_AUTOCOMPLETE_KEY,
        OPTION_USE_TAB_KEY,
        OPTION_MATCH_ONLY_AT_BEGINNING,
        OPTION_COMMENT_STRING_KEY,
        OPTION_MINIMUM_CHARACTER_COUNT_KEY,
    ]).then(
        result => {
            setTextValue("items", result[OPTION_ITEMS_KEY]);
            setBooleanValue("contextmenuEnabled", result[OPTION_CONTEXTMENU_KEY]);
            setBooleanValue("autocompleteEnabled", result[OPTION_AUTOCOMPLETE_KEY]);
            setBooleanValue("useTabToChooseItems", result[OPTION_USE_TAB_KEY]);
            setBooleanValue("matchOnlyAtBeginning", result[OPTION_MATCH_ONLY_AT_BEGINNING]);
            setTextValue("commentString", result[OPTION_COMMENT_STRING_KEY]);
            setTextValue("minimumCharacterCount", result[OPTION_MINIMUM_CHARACTER_COUNT_KEY]);
        }
    );
}

function enableAutosave() {
    for (let input of document.querySelectorAll("input:not([type=radio]):not([type=checkbox]), textarea")) {
        input.addEventListener("input", saveOptions);
    }
    for (let input of document.querySelectorAll("input[type=radio], input[type=checkbox]")) {
        input.addEventListener("change", saveOptions);
    }
}

function setTextValue(elementID, newValue) {
    let oldValue = document.getElementById(elementID).value;

    if (oldValue !== newValue) {
        document.getElementById(elementID).value = newValue;
    }
}

function setBooleanValue(elementID, newValue) {
    document.getElementById(elementID).checked = newValue;
}

function saveOptions(event) {
    event.preventDefault();
    browser.storage.local.set({
        [OPTION_ITEMS_KEY]: document.querySelector("#items").value,
        [OPTION_CONTEXTMENU_KEY]: document.querySelector("#contextmenuEnabled").checked,
        [OPTION_AUTOCOMPLETE_KEY]: document.querySelector("#autocompleteEnabled").checked,
        [OPTION_USE_TAB_KEY]: document.querySelector("#useTabToChooseItems").checked,
        [OPTION_MATCH_ONLY_AT_BEGINNING]: document.querySelector("#matchOnlyAtBeginning").checked,
        [OPTION_COMMENT_STRING_KEY]: document.querySelector("#commentString").value,
        [OPTION_MINIMUM_CHARACTER_COUNT_KEY]: parseInt(document.querySelector("#minimumCharacterCount").value),
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.addEventListener("DOMContentLoaded", enableAutosave);
document.querySelector("form").addEventListener("submit", saveOptions);

browser.storage.onChanged.addListener(restoreOptions);
