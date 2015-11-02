const simplePreferences = require("sdk/simple-prefs");
const ui = require("./lib/ui");

let addMenu;
let fillMenu;
let panel;

function __showPanel() {
    if (panel) {
        panel.show();
    }
}

function __fillPanel() {
    if (panel) {
        panel.port.emit("show", simplePreferences.prefs.items);
    }
}

function __save(text) {
    if (panel) {
        panel.hide();
        simplePreferences.prefs.items = text;
    }
}

function __updateMenu() {
    ui.updateContextMenu(fillMenu);
}

exports.main = function(options) {
    console.log("Starting up with reason ", options.loadReason);

    addMenu = ui.makeAddMenu();
    fillMenu = ui.makeFillMenu();

    // Use a panel because there is no multiline string in simple-prefs
    // show and fill on button click in preference
    panel = ui.makePanel();
    panel.on("show", __fillPanel);

    // save content and hide on save button click
    panel.port.on("save", __save);

    simplePreferences.on("editButton", __showPanel);
    simplePreferences.on("items", __updateMenu);

    __updateMenu();
};

exports.onUnload = function(reason) {
    console.log("Closing down with reason ", reason);

    simplePreferences.removeListener("items", __updateMenu);
    simplePreferences.removeListener("editButton", __showPanel);

    if (panel) {
        panel.destroy();
        panel = null;
    }

    if (fillMenu) {
        fillMenu.destroy();
        fillMenu = null;
    }

    if (addMenu) {
        addMenu.destroy();
        addMenu = null;
    }
};
