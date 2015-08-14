/* globals window, self */
/* jshint unused: false */
self.on("click", function (node, data) {
    let selection;
    if (node.selectionStart || node.selectionEnd) {
        selection = node.value.slice(node.selectionStart, node.selectionEnd);
    } else {
        selection = window.getSelection().toString();
    }
    if (selection.length > 0) {
        self.postMessage(selection);
    }
});
