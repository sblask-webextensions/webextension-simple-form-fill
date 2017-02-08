function restoreOptions() {
    browser.storage.local.get(["autocompleteEnabled", "items"], result => {
        document.querySelector("#autocompleteEnabled").checked = result.autocompleteEnabled;
        document.querySelector("#items").value = result.items;
    });
}

function saveOptions(event) {
    event.preventDefault();
    browser.storage.local.set({
        autocompleteEnabled: document.querySelector("#autocompleteEnabled").checked,
        items: document.querySelector("#items").value,
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);

browser.storage.onChanged.addListener(restoreOptions);
