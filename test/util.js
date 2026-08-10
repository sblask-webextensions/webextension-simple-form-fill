import test from "tape";

import * as util from "../util.js";

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

const FIXED_DATE = new Date(2027, 2, 5, 13, 4, 9);

test("Test strftime - formats date and time", function(assert) {
    assert.equal(
        util.strftime("%Y-%m-%d %H:%M:%S", FIXED_DATE),
        "2027-03-05 13:04:09",
    );
    assert.end();
});

test("Test strftime - formats weekday, month, short year and am/pm", function(assert) {
    assert.equal(
        util.strftime("%A %a %B %b %I %p %y", FIXED_DATE),
        "Friday Fri March Mar 01 pm 27",
    );
    assert.end();
});

test("Test strftime - leaves text untouched if it contains no strftime placeholders", function(assert) {
    assert.equal(
        util.strftime("no placeholders here"),
        "no placeholders here",
    );
    assert.end();
});

test("Test formatItem - no comment string", function(assert) {
    const result = util.formatItem("value # comment", "");
    assert.deepEqual(result, {
        withComment: "value # comment",
        withoutComment: "value # comment",
    });
    assert.end();
});

test("Test formatItem - comment string not present in item", function(assert) {
    const result = util.formatItem("value", " # ");
    assert.deepEqual(result, {
        withComment: "value",
        withoutComment: "value",
    });
    assert.end();
});

test("Test formatItem - plain comment", function(assert) {
    const result = util.formatItem("value # a comment", " # ");
    assert.deepEqual(result, {
        withComment: "value # a comment",
        withoutComment: "value",
    });
    assert.end();
});

test("Test formatItem - strftime in comment formats value but not comment", function(assert) {
    const result = util.formatItem("%Y-%m-%d # strftime %Y-%m-%d", " # ");
    const expected = util.strftime("%Y-%m-%d");
    assert.deepEqual(result, {
        withComment: expected + " # strftime %Y-%m-%d",
        withoutComment: expected,
    });
    assert.end();
});

test("Test formatItem - strftime marker is case-insensitive", function(assert) {
    const result = util.formatItem("%Y # STRFTIME", " # ");
    const expected = util.strftime("%Y");
    assert.deepEqual(result, {
        withComment: expected + " # STRFTIME",
        withoutComment: expected,
    });
    assert.end();
});

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
