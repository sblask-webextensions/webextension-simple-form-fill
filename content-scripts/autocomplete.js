"use strict";

function getInputs() {
    // INPUT_QUERY is defined in checker.js
    return document.querySelectorAll(INPUT_QUERY); // eslint-disable-line no-undef
}

function addAutoCompleteToInputs(message) {
    if (!message.itemList) {
        return;
    }

    for (const input of getInputs()) {
        const jQueryInput = $(input);
        jQueryInput.attr("autocomplete", "on");

        jQueryInput.off("keydown.simpleFormFill");
        jQueryInput.on("keydown.simpleFormFill", openAutocompleteOnArrowDown(jQueryInput));
        if (message.useTabToChooseItems) {
            jQueryInput.on("keydown.simpleFormFill", keydownWrapper(jQueryInput));
        }

        jQueryInput.autocomplete({
            source: sourceWrapper(
                message.itemList,
                message.commentString,
                message.matchOnlyAtBeginning,
            ),
            // custom select to prevent reset of value after choosing item
            select: function(_event, {item}) {
                jQueryInput.val(item.value);
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

        const autocomplete = jQueryInput.data("ui-autocomplete");
        autocomplete.liveRegion
            .attr("aria-live", "off")
            .addClass("simple-form-fill");

        autocomplete._resizeMenu = function() {
            this.menu.element.css("cssText", getCSS(jQueryInput));
            this.menu.element.outerWidth(jQueryInput.outerWidth());
        };

        autocomplete._renderItem = function(ul, item) {
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

    return source;
}

function openAutocompleteOnArrowDown(jQueryInput) {
    function keydown(event) {
        if (
            event.keyCode !== $.ui.keyCode.DOWN
            || jQueryInput.val() !== ""
            || jQueryInput.autocomplete("widget").is(":visible")
        ) {
            return;
        }

        const minimumCharacterCount = jQueryInput.autocomplete("option", "minLength");
        jQueryInput.autocomplete("option", "minLength", 0);
        jQueryInput.autocomplete("search", "");
        jQueryInput.autocomplete("option", "minLength", minimumCharacterCount);
    }

    return keydown;
}

function keydownWrapper(jQueryInput) {
    function keydown(event) {
        const isOpen = jQueryInput.autocomplete("widget").is(":visible");

        if (event.keyCode == $.ui.keyCode.TAB && isOpen) {
            event.stopImmediatePropagation();

            let parameters;
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

    const css = `

        background-color:           ${backgroundColor} !important;

        border-left-color:          ${borderColor}     !important;
        border-top-color:           ${borderColor}     !important;
        border-bottom-color:        ${borderColor}     !important;
        border-right-color:         ${borderColor}     !important;

        border-bottom-left-radius:  ${borderRadius}    !important;
        border-bottom-right-radius: ${borderRadius}    !important;
        border-top-left-radius:     ${borderRadius}    !important;
        border-top-right-radius:    ${borderRadius}    !important;

        border-bottom-style:        ${borderStyle}     !important;
        border-left-style:          ${borderStyle}     !important;
        border-right-style:         ${borderStyle}     !important;
        border-top-style:           ${borderStyle}     !important;

        border-bottom-width:        ${borderWidth}     !important;
        border-left-width:          ${borderWidth}     !important;
        border-right-width:         ${borderWidth}     !important;
        border-top-width:           ${borderWidth}     !important;


        color:                      ${color}           !important;

        padding-bottom:             0                  !important;
        padding-left:               0                  !important;
        padding-right:              0                  !important;
        padding-top:                0                  !important;

    `;

    return css;
}

function destroyAutocompleteWidgets() {
    for (const input of getInputs()) {
        const jQueryInput = $(input);
        jQueryInput.off(".simpleFormFill");
        if (jQueryInput.data("ui-autocomplete")) {
            jQueryInput.autocomplete("destroy");
        }
    }
}

browser.runtime.onMessage.addListener((message, sender) => {
    if (sender.id !== browser.runtime.id) {
        return;
    }

    if (message?.type === "update-autocomplete-options") {
        addAutoCompleteToInputs(message);
    } else if (message?.type === "update-autocomplete-status" && message.enabled === false) {
        destroyAutocompleteWidgets();
    }
});
