"use strict";

function addAutoCompleteToInputs(message) {
    if (!message.itemList) {
        return;
    }

    // getInputs() defined in checker.js
    for (const input of getInputs()) { //  eslint-disable-line no-undef
        const jQueryInput = $(input);
        jQueryInput.attr("autocomplete", "on");

        if (message.useTabToChooseItems) {
            jQueryInput.keydown(keydownWrapper(jQueryInput));
        }

        jQueryInput.autocomplete({
            source: sourceWrapper(
                message.itemList,
                message.commentString,
                message.matchOnlyAtBeginning,
            ),
            // custom select to prevent reset of value after choosing item
            select: function(_event, {item}) {
                jQueryInput.val( item.value );
                const detail = {
                    simpleFormFillCustomInputEvent: true,
                };
                input.dispatchEvent(new CustomEvent("input", {detail}));
                return false;
            },
            // custom search to prevent autocomplete from re-opening
            search: function(event, _ui) {
                let originalEvent = event;
                while (originalEvent.originalEvent) {
                    originalEvent = originalEvent.originalEvent;
                }
                const detail = originalEvent.detail;
                if (detail && detail.simpleFormFillCustomInputEvent) {
                    return false;
                }
                return true;
            },
            autoFocus: false,
            delay: 100,
            minLength: message.minimumCharacterCount,
            classes: {
                "ui-autocomplete": "simple-form-fill",
            },
        });

        jQueryInput.data("ui-autocomplete")._resizeMenu = function() {
            this.menu.element.css("cssText", getCSS(jQueryInput));
            this.menu.element.outerWidth(jQueryInput.outerWidth());
        };

        jQueryInput.data("ui-autocomplete")._renderItem = function(ul, item) {
            let divContent = item.label;
            if (message.commentString && item.label.indexOf(message.commentString) != -1) {
                const splits = item.label.split(message.commentString);
                divContent = splits[0] + "<span class='comment'>" + message.commentString + splits[1] + "</span>";
            }

            const li = $("<li>").append($("<div>").append(divContent));
            ul.append(li);

            return li;
        };
    }
}

function sourceWrapper(itemList, commentString, matchOnlyAtBeginning) {
    function source(request, response) {
        const term = $.trim(request.term);
        let matcher = new RegExp($.ui.autocomplete.escapeRegex(term), "i");

        if (matchOnlyAtBeginning) {
            matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex(term), "i");
        }

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

function keydownWrapper(jQueryInput) {
    function keydown(event) {
        const isOpen = jQueryInput.autocomplete("widget").is(":visible");

        if (event.keyCode == $.ui.keyCode.TAB && isOpen) {
            event.stopImmediatePropagation();

            let parameters = undefined;
            if (event.shiftKey) {
                parameters = {keyCode: $.ui.keyCode.UP};
            } else {
                parameters = {keyCode: $.ui.keyCode.DOWN};
            }

            jQueryInput.trigger(jQuery.Event("keydown", parameters));
            return false;
        }

        // disable autocomplete's weird handling for shift key
        if (event.keyCode == 16 && isOpen) {
            event.stopImmediatePropagation();
        }
    }

    return keydown;
}

function getCSS(jQueryInput) {
    let backgroundColor = jQueryInput.css("background-color");
    const color = jQueryInput.css("color");

    let borderColor = jQueryInput.css("border-bottom-color");
    let borderStyle = jQueryInput.css("border-bottom-style");
    let borderWidth = jQueryInput.css("border-bottom-width");
    const borderRadius = jQueryInput.css("border-bottom-left-radius");

    // inset is default -> no css set
    if (borderStyle == "inset") {
        return "";
    }

    if (backgroundColor == "transparent" || backgroundColor.match(/rgba\(/)) {
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

    const css = "" +

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
