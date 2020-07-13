"use strict";

const INPUT_QUERY = "input" +
    ":not([type=checkbox])" +
    ":not([type=color])" +
    ":not([type=hidden])" +
    ":not([type=image])" +
    ":not([type=password])" +
    ":not([type=radio])" +
    ":not([type=range])" +
    ":not([type=submit])" +
    "";

function getInputs() {
    return document.querySelectorAll(INPUT_QUERY);
}

let existingInputsCount = 0;
let initializationRequested = false;
function maybeSendMessage() {
    const newInputsCount = getInputs().length;
    if (existingInputsCount != newInputsCount) {
        console.log("Checker for " + window.location.href + " request refresh");
        browser.runtime.sendMessage({
            text: "refreshAutocomplete",
            requireInizialization: !initializationRequested,
        });
        existingInputsCount = newInputsCount;
        initializationRequested = true;
    }
}

const observer = new MutationObserver(function(_mutations) {
    maybeSendMessage();
});

observer.observe(document, {
    childList: true,
    subtree: true,
});

maybeSendMessage();
