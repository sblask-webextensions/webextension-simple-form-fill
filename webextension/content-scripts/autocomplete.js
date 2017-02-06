"use strict";

browser.runtime.onMessage.addListener(request => {
    console.log(`Got ${request.itemList}`)
    for (let input of document.getElementsByTagName("input")) {
        $(input).attr("autocomplete", "on");
        $(input).autocomplete({
            source: request.itemList,
            autoFocus: true,
            delay: 300,
            minLength: 1,
        });
    }
});
