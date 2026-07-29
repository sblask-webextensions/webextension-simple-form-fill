export function mergeItemString(targetString, sourceString) {
    if (targetString == undefined || targetString === "") {
        return sourceString == undefined ? "" : sourceString;
    }
    if (sourceString == undefined || targetString === "") {
        return targetString;
    }

    const target = targetString.split("\n");
    const source = sourceString.split("\n");
    return [
        ...target,
        "",
        ...source.filter((element) => !target.includes(element) || element === ""),
    ].join("\n").trim();
}
