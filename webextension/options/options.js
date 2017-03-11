function restoreOptions() {
    browser.storage.local.get([
        "autocompleteEnabled",
        "useTabToChooseItems",
        "items",
    ], result => {
        document.querySelector("#autocompleteEnabled").checked = result.autocompleteEnabled;
        document.querySelector("#useTabToChooseItems").checked = result.useTabToChooseItems;
        document.querySelector("#items").value = result.items;
    });
}

function saveOptions(event) {
    event.preventDefault();
    browser.storage.local.set({
        autocompleteEnabled: document.querySelector("#autocompleteEnabled").checked,
        useTabToChooseItems: document.querySelector("#useTabToChooseItems").checked,
        items: document.querySelector("#items").value,
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);

browser.storage.onChanged.addListener(restoreOptions);
