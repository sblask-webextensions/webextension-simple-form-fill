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
function maybeSendMessage(tabId, requireInizialization) {
    let newInputsCount = getInputs().length;
    if (existingInputsCount != newInputsCount) {
        console.log("Checker request refresh of autocomplete");
        browser.runtime.sendMessage({
            text: "refreshAutocomplete",
            tabId: tabId,
            requireInizialization: requireInizialization,
        });
        existingInputsCount = newInputsCount;
    }
}

browser.runtime.onMessage.addListener(message => {
    if (message.tabId) {
        console.log("Checker got message");
        let observer = new MutationObserver(function(_mutations) {
            maybeSendMessage(message.tabId, false);
        });

        observer.observe(document, {
            childList: true,
            subtree: true,
        });

        maybeSendMessage(message.tabId, true);
    }
});
