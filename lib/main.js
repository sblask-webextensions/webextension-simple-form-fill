const contextMenu = require("sdk/context-menu");
const simplePreferences = require('sdk/simple-prefs');

const preferences = simplePreferences.prefs;

/* globals window, self */
/* jshint unused: false */

const addClickHandler = function (node, data) {
    let selection;
    if (node.selectionStart || node.selectionEnd) {
        selection = node.value.slice(node.selectionStart, node.selectionEnd);
    } else {
        selection = window.getSelection().toString();
    }
    if (selection.length > 0) {
        self.postMessage(selection);
    }
};

const selectClickHandler = function (node, data) {
    if (node.selectionStart || node.selectionEnd) {
        node.value = node.value.slice(0, node.selectionStart) + data + node.value.slice(node.selectionEnd, node.value.length);
    } else {
        node.value = node.value.slice(0, node.caretPosition()) + data + node.value.slice(node.caretPosition(), node.value.length);
    }
};

contextMenu.Item({
    label: "Add to Simple Form Fill",
    context: contextMenu.SelectionContext(),
    contentScript: 'self.on("click", ' + addClickHandler.toString() + ');',
    onMessage: function (text) {
        preferences.items = preferences.items + "|" + text.replace("|", " ");
    }
});

var fillMenu = contextMenu.Menu({
    label: "Simple Form Fill",
    context: contextMenu.SelectorContext("input"),
    items: []
});

function populateMenu() {
    let menuItem;
    for (menuItem of fillMenu.items) {
        fillMenu.removeItem(menuItem);
    }

    let preferenceItem;
    for (preferenceItem of preferences.items.split("|")) {
        if (preferenceItem.length > 0) {
            fillMenu.addItem(contextMenu.Item({
                label: preferenceItem,
                data: preferenceItem,
                contentScript: 'self.on("click", ' + selectClickHandler.toString() + ');',
            }));
        }
    }
}

simplePreferences.on("items", function(){
    populateMenu();
});

populateMenu();
