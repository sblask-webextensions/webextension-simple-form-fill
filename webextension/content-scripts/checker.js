"use strict";

let existingInputs = document.getElementsByTagName("input");
let existingInputsCount = 0;

function maybeSendMessage(tabId, requireInizialization) {
    if (existingInputsCount != existingInputs.length) {
        console.log("Checker request refresh of autocomplete");
        browser.runtime.sendMessage({
            text: "refreshAutocomplete",
            tabId: tabId,
            requireInizialization: requireInizialization,
        });
        existingInputsCount = existingInputs.length;
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
