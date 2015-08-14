/* globals self */
self.on("click", function (node, data) {
    if (node.selectionStart || node.selectionEnd) {
        node.value = node.value.slice(0, node.selectionStart) + data + node.value.slice(node.selectionEnd, node.value.length);
    } else if (node.caretPosition) {
        node.value = node.value.slice(0, node.caretPosition()) + data + node.value.slice(node.caretPosition(), node.value.length);
    } else {
        node.value = node.value + data;
    }
});
