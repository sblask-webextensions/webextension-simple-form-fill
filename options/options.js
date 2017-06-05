function restoreOptions() {
    browser.storage.local.get([
        "autocompleteEnabled",
        "commentString",
        "items",
        "useTabToChooseItems",
    ]).then(
        result => {
            document.querySelector("#autocompleteEnabled").checked = result.autocompleteEnabled;
            document.querySelector("#commentString").value = result.commentString || "";
            document.querySelector("#items").value = result.items || "";
            document.querySelector("#useTabToChooseItems").checked = result.useTabToChooseItems;
        }
    );
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
document.querySelector("form").addEventListener("submit", saveOptions);

browser.storage.onChanged.addListener(restoreOptions);
