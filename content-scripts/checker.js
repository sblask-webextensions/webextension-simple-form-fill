"use strict";

const INPUT_QUERY = `
    input
    :not([type=checkbox])
    :not([type=color])
    :not([type=hidden])
    :not([type=image])
    :not([type=password])
    :not([type=radio])
    :not([type=range])
    :not([type=submit])
`.replaceAll(/\s/g, "");

let autocompleteEnabled = false;
let autocompleteRefreshPromise = Promise.resolve();
let requireInizialization = true;

function maybeRequestAutocompleteRefresh() {
    if (!document.querySelector(INPUT_QUERY)) {
        return;
    }

    autocompleteRefreshPromise = autocompleteRefreshPromise.then(requestAutocompleteRefresh);
}

async function requestAutocompleteRefresh() {
    console.log("Checker for " + window.location.href + " request refresh");
    try {
        const success = await browser.runtime.sendMessage({
            type: "refresh-autocomplete",
            requireInizialization,
        });
        if (success) {
            requireInizialization = false;
        }
    } catch (error) {
        console.warn(error.message, error.stack);
    }
}

function mutationsContainInput(mutations) {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (
                node.nodeType === Node.ELEMENT_NODE
                && (node.matches(INPUT_QUERY) || node.querySelector(INPUT_QUERY))
            ) {
                return true;
            }
        }
    }

    return false;
}

const observer = new MutationObserver(function(mutations) {
    if (mutationsContainInput(mutations)) {
        maybeRequestAutocompleteRefresh();
    }
});

function enableAutocomplete() {
    if (autocompleteEnabled) {
        maybeRequestAutocompleteRefresh();
        return;
    }

    autocompleteEnabled = true;
    maybeRequestAutocompleteRefresh();
    const observerTarget = document.body ?? document.documentElement;
    observer.observe(observerTarget, {
        childList: true,
        subtree: true,
    });
}

function disableAutocomplete() {
    if (!autocompleteEnabled) {
        return;
    }

    autocompleteEnabled = false;
    observer.disconnect();
}

function setAutocompleteEnabled(enabled) {
    if (enabled) {
        enableAutocomplete();
    } else {
        disableAutocomplete();
    }
}

let autocompleteStatePromise = Promise.resolve();

browser.runtime.onMessage.addListener((message, sender) => {
    if (
        sender.id !== browser.runtime.id
        || message?.type !== "update-autocomplete-status"
        || typeof message.enabled !== "boolean"
    ) {
        return;
    }

    autocompleteStatePromise = autocompleteStatePromise.then(() => {
        setAutocompleteEnabled(message.enabled);
    });
});

autocompleteStatePromise = browser.runtime.sendMessage({
    type: "get-autocomplete-status",
})
    .then(setAutocompleteEnabled)
    .catch((error) => {
        console.warn(error.message, error.stack);
    });
