"use strict";

let inputs = document.getElementsByTagName("input");

function addAutoCompleteToInputs(itemList) {
    for (let input of inputs) {
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
