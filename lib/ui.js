const contextMenu = require("sdk/context-menu");
const panel = require("sdk/panel");
const self = require("sdk/self");
const simplePreferences = require("sdk/simple-prefs");

function makeAddMenu() {
    const preferences = simplePreferences.prefs;
    return contextMenu.Item({
        label: "Add to Simple Form Fill",
        context: contextMenu.SelectionContext(),
        contentScriptFile: "./content_script_add.js",
        image: self.data.url("icon.svg"),
        onMessage: function(newString) {
            preferences.items = preferences.items + "\n" + newString;
        },
    });
}

exports.makeAddMenu = makeAddMenu;

function makeFillMenu() {
    return contextMenu.Menu({
        label: "Simple Form Fill",
        context: contextMenu.PredicateContext(function(context) {
            if (context.targetName === "input") {
                return true;
            }

            if (context.targetName === "textarea") {
                return true;
            }

            return false;
        }),

        image: self.data.url("icon.svg"),
        items: [],
    });
}

exports.makeFillMenu = makeFillMenu;

function makePanel() {
    return panel.Panel({
        contentURL: "./panel.html",
        height: 300,
        width: 300,
    });
}

exports.makePanel = makePanel;

function updateContextMenu(fillMenu) {
    for (let menuItem of fillMenu.items) {
        fillMenu.removeItem(menuItem);
    }

    const preferences = simplePreferences.prefs;
    for (let preferenceItem of preferences.items.split("\n")) {
        if (preferenceItem.length > 0) {
            fillMenu.addItem(contextMenu.Item({
                label: preferenceItem,
                data: preferenceItem,
                contentScriptFile: "./content_script_select.js",
            }));
        }
    }
}

exports.updateContextMenu = updateContextMenu;
