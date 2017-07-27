function restoreOptions() {
    browser.storage.local.get([
        "items",
        "autocompleteEnabled",
        "useTabToChooseItems",
        "commentString",
        "minimumCharacterCount",
    ]).then(
        result => {
            setTextValue("items", result.items);
            setBooleanValue("autocompleteEnabled", result.autocompleteEnabled);
            setBooleanValue("useTabToChooseItems", result.useTabToChooseItems);
            setTextValue("commentString", result.commentString);
            setTextValue("minimumCharacterCount", result.minimumCharacterCount);
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
        items: document.querySelector("#items").value,
        autocompleteEnabled: document.querySelector("#autocompleteEnabled").checked,
        useTabToChooseItems: document.querySelector("#useTabToChooseItems").checked,
        commentString: document.querySelector("#commentString").value,
        minimumCharacterCount: parseInt(document.querySelector("#minimumCharacterCount").value),
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.addEventListener("DOMContentLoaded", enableAutosave);
document.querySelector("form").addEventListener("submit", saveOptions);

browser.storage.onChanged.addListener(restoreOptions);
