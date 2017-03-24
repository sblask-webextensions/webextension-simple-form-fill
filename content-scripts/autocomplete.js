"use strict";

function addAutoCompleteToInputs(message) {
    if (!message.itemList) {
        return;
    }

    // getInputs() defined in checker.js
    for (let input of getInputs()) { //  eslint-disable-line no-undef
        let inputElement = $(input);
        inputElement.attr("autocomplete", "on");

        if (message.useTabToChooseItems) {
            inputElement.keydown(keydownWrapper(inputElement));
        }

        inputElement.autocomplete({
            source: sourceWrapper(message.itemList, message.commentString),
            autoFocus: false,
            delay: 100,
            minLength: 1,
            classes: {
                "ui-autocomplete": "simple-form-fill",
            },
        });

        inputElement.data("ui-autocomplete")._resizeMenu = function() {
            this.menu.element.css("cssText", getCSS(inputElement));
            this.menu.element.outerWidth(inputElement.outerWidth());
        };

        inputElement.data("ui-autocomplete")._renderItem = function(ul, item) {
            let divContent = item.label;
            if (message.commentString && item.label.indexOf(message.commentString) != -1) {
                let splits = item.label.split(message.commentString);
                divContent = splits[0] + "<span class='comment'>" + message.commentString + splits[1] + "</span>";
            }

            let li = $("<li>").append($("<div>").append(divContent));
            ul.append(li);

            return li;
        };
    }
}

function sourceWrapper(itemList, commentString) {
    function source(request, response) {
        let term = $.trim(request.term);
        let matcher = new RegExp($.ui.autocomplete.escapeRegex(term), "i");

        if (term !== "") {
            response(
                $.map(itemList, function(item) {
                    if (matcher.test(item)) {
                        let value = item;
                        if (commentString) {
                            value = $.trim(item.split(commentString)[0]);
                        }

                        if (value) {
                            return {label: item, value: value};
                        }
                    }
                })
            );
        }
    }

    return source;
}

function keydownWrapper(inputElement) {
    function keydown(event) {
        let isOpen = inputElement.autocomplete("widget").is(":visible");

        if (event.keyCode == $.ui.keyCode.TAB && isOpen) {
            event.stopImmediatePropagation();

            let parameters = undefined;
            if (event.shiftKey) {
                parameters = { keyCode: $.ui.keyCode.UP };
            } else {
                parameters = { keyCode: $.ui.keyCode.DOWN };
            }

            inputElement.trigger(jQuery.Event("keydown", parameters));
        }

        // disable autocomplete's weird handling for shift key
        if (event.keyCode == 16 && isOpen) {
            event.stopImmediatePropagation();
        }
    }

    return keydown;
}

function getCSS(inputElement) {
    let backgroundColor = inputElement.css("background-color");
    let color = inputElement.css("color");

    let borderColor = inputElement.css("border-bottom-color");
    let borderStyle = inputElement.css("border-bottom-style");
    let borderWidth = inputElement.css("border-bottom-width");
    let borderRadius = inputElement.css("border-bottom-left-radius");

    // inset is default -> no css set
    if (borderStyle == "inset") {
        return "";
    }

    if (backgroundColor == "transparent") {
        backgroundColor = "#ffffff";
    }

    if (borderColor == backgroundColor || borderColor == "rgb(34, 34, 34)") {
        borderColor = "#c5c5c5";
    }

    if (borderStyle == "none") {
        borderStyle = "solid";
    }

    if (borderWidth == "0px") {
        borderWidth = "1px";
    }

    let css = "" +

        "background-color: "           + backgroundColor + " !important;" +

        "border-left-color: "          + borderColor     + " !important;" +
        "border-top-color: "           + borderColor     + " !important;" +
        "border-bottom-color: "        + borderColor     + " !important;" +
        "border-right-color: "         + borderColor     + " !important;" +

        "border-bottom-left-radius: "  + borderRadius    + " !important;" +
        "border-bottom-right-radius: " + borderRadius    + " !important;" +
        "border-top-left-radius: "     + borderRadius    + " !important;" +
        "border-top-right-radius: "    + borderRadius    + " !important;" +

        "border-bottom-style: "        + borderStyle     + " !important;" +
        "border-left-style: "          + borderStyle     + " !important;" +
        "border-right-style: "         + borderStyle     + " !important;" +
        "border-top-style: "           + borderStyle     + " !important;" +

        "border-bottom-width: "        + borderWidth     + " !important;" +
        "border-left-width: "          + borderWidth     + " !important;" +
        "border-right-width: "         + borderWidth     + " !important;" +
        "border-top-width: "           + borderWidth     + " !important;" +

        "color: "                      + color           + " !important;" +

        "padding-bottom: "             + "0"             + " !important;" +
        "padding-left: "               + "0"             + " !important;" +
        "padding-right: "              + "0"             + " !important;" +
        "padding-top: "                + "0"             + " !important;" +

        "";

    return css;
}

browser.runtime.onMessage.addListener(message => {
    addAutoCompleteToInputs(message);
});
