const test = require("tape");

const util = require("./util");

const DEFAULT_TARGET = [
    "one",
    "two",
    "",
    "three",
];

const DEFAULT_SOURCE = [
    "four",
    "",
    "five",
    "six",
];

test("Test mergeItemString - null source", function(assert) {
    const source = null;
    const merged = util.mergeItemString(
        DEFAULT_TARGET.join("\n"),
        source,
    ).split("\n");
    assert.equal(
        JSON.stringify(merged),
        JSON.stringify(DEFAULT_TARGET),
    );
    assert.end();
});

test("Test mergeItemString - empty source", function(assert) {
    const merged = util.mergeItemString(
        DEFAULT_TARGET.join("\n"),
        "",
    ).split("\n");
    assert.equal(
        JSON.stringify(merged),
        JSON.stringify(DEFAULT_TARGET),
    );
    assert.end();
});

test("Test mergeItemString - null target", function(assert) {
    const merged = util.mergeItemString(
        null,
        DEFAULT_SOURCE.join("\n"),
    ).split("\n");
    assert.equal(
        JSON.stringify(merged),
        JSON.stringify(DEFAULT_SOURCE),
    );
    assert.end();
});

test("Test mergeItemString - empty target", function(assert) {
    const merged = util.mergeItemString(
        "",
        DEFAULT_SOURCE.join("\n"),
    ).split("\n");
    assert.equal(
        JSON.stringify(merged),
        JSON.stringify(DEFAULT_SOURCE),
    );
    assert.end();
});

test("Test mergeList - null source and target", function(assert) {
    const merged = util.mergeItemString(
        null,
        null,
    );
    assert.equal(
        merged,
        "",
    );
    assert.end();
});

test("Test mergeList - empty source and target", function(assert) {
    const merged = util.mergeItemString(
        "",
        "",
    );
    assert.equal(
        merged,
        "",
    );
    assert.end();
});

test("Test mergeItemString - nothing common", function(assert) {
    const merged = util.mergeItemString(
        DEFAULT_TARGET.join("\n"),
        DEFAULT_SOURCE.join("\n"),
    ).split("\n");
    const expected = [
        ...DEFAULT_TARGET,
        "",
        ...DEFAULT_SOURCE,
    ];
    assert.equal(
        JSON.stringify(merged),
        JSON.stringify(expected),
    );
    assert.end();
});

test("Test mergeItemString - common at beginning", function(assert) {
    const source = [
        "one",
        ...DEFAULT_SOURCE,
    ];
    const merged = util.mergeItemString(
        DEFAULT_TARGET.join("\n"),
        source.join("\n"),
    ).split("\n");
    const expected = [
        ...DEFAULT_TARGET,
        "",
        ...DEFAULT_SOURCE,
    ];
    assert.equal(
        JSON.stringify(merged),
        JSON.stringify(expected),
    );
    assert.end();
});

test("Test mergeItemString - common at the end", function(assert) {
    const source = [
        ...DEFAULT_SOURCE,
        "one",
    ];
    const merged = util.mergeItemString(
        DEFAULT_TARGET.join("\n"),
        source.join("\n"),
    ).split("\n");
    const expected = [
        ...DEFAULT_TARGET,
        "",
        ...DEFAULT_SOURCE,
    ];
    assert.equal(
        JSON.stringify(merged),
        JSON.stringify(expected),
    );
    assert.end();
});

test("Test mergeItemString - common in the middle", function(assert) {
    const source = [...DEFAULT_SOURCE];
    source.splice(2, 0, "one");
    const merged = util.mergeItemString(
        DEFAULT_TARGET.join("\n"),
        source.join("\n"),
    ).split("\n");
    const expected = [
        ...DEFAULT_TARGET,
        "",
        ...DEFAULT_SOURCE,
    ];
    assert.equal(
        JSON.stringify(merged),
        JSON.stringify(expected),
    );
    assert.end();
});

test("Test mergeItemString - different order", function(assert) {
    const source = [
        "three",
        "two",
        "one",
    ];
    const merged = util.mergeItemString(
        DEFAULT_TARGET.join("\n"),
        source.join("\n"),
    ).split("\n");
    assert.equal(
        JSON.stringify(merged),
        JSON.stringify(DEFAULT_TARGET),
    );
    assert.end();
});
