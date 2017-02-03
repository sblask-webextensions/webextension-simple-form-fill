function restoreOptions() {
    browser.storage.local.get("items", result => {
        document.querySelector("#items").value = result.items;
    });
}

function saveOptions(event) {
    event.preventDefault();
    browser.storage.local.set({
        items: document.querySelector("#items").value,
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);

browser.storage.onChanged.addListener(restoreOptions);
