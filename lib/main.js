const contextMenu = require("sdk/context-menu");
const panel = require("sdk/panel");
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
    } else if (node.caretPosition) {
        node.value = node.value.slice(0, node.caretPosition()) + data + node.value.slice(node.caretPosition(), node.value.length);
    } else {
        node.value = node.value + data;
    }
};

contextMenu.Item({
    label: "Add to Simple Form Fill",
    context: contextMenu.SelectionContext(),
    contentScript: 'self.on("click", ' + addClickHandler.toString() + ');',
    onMessage: function (newString) {
        preferences.items = preferences.items + "\n" + newString;
    }
});

var fillMenu = contextMenu.Menu({
    label: "Simple Form Fill",
    context: contextMenu.SelectorContext("input"),
    items: []
});

var editPanel = panel.Panel({
    contentURL: "./panel.html",
    height: 300,
    width: 300
});

function populateMenu() {
    let menuItem;
    for (menuItem of fillMenu.items) {
        fillMenu.removeItem(menuItem);
    }

    let preferenceItem;
    for (preferenceItem of preferences.items.split("\n")) {
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

simplePreferences.on("editButton", function() {
    editPanel.show();
});

editPanel.port.on("save", function (text) {
    editPanel.hide();
    preferences.items = text;
});

editPanel.on("show", function() {
    editPanel.port.emit("show", preferences.items);
});

populateMenu();
