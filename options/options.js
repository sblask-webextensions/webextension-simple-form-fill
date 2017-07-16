function restoreOptions() {
    browser.storage.local.get([
        "autocompleteEnabled",
        "commentString",
        "items",
        "useTabToChooseItems",
    ]).then(
        result => {
            setBooleanValue("autocompleteEnabled", result.autocompleteEnabled);
            setTextValue("commentString", result.commentString || "");
            setTextValue("items", result.items || "");
            setBooleanValue("useTabToChooseItems", result.useTabToChooseItems);
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
        autocompleteEnabled: document.querySelector("#autocompleteEnabled").checked,
        commentString: document.querySelector("#commentString").value,
        items: document.querySelector("#items").value,
        useTabToChooseItems: document.querySelector("#useTabToChooseItems").checked,
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.addEventListener("DOMContentLoaded", enableAutosave);
document.querySelector("form").addEventListener("submit", saveOptions);

browser.storage.onChanged.addListener(restoreOptions);
