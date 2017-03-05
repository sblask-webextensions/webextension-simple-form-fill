"use strict";

function addAutoCompleteToInputs(itemList) {
    // getInputs() defined in checker.js
    for (let input of getInputs()) { //  eslint-disable-line no-undef
        $(input).attr("autocomplete", "on");
        $(input).autocomplete({
            source: itemList,
            autoFocus: true,
            delay: 100,
            minLength: 1,
        });
    }
}

browser.runtime.onMessage.addListener(message => {
    if (message.itemList) {
        console.log("Completer got message");
        addAutoCompleteToInputs(message.itemList);
    }
});
