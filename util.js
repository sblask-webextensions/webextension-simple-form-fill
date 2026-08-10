const STRFTIME_MARKER = "strftime";

export function strftime(format, date = new Date()) {
    const locale = undefined;
    const pad = (num) => String(num).padStart(2, "0");

    const tokens = {
        "%A": new Intl.DateTimeFormat(locale, {weekday: "long"}).format(date),
        "%B": new Intl.DateTimeFormat(locale, {month: "long"}).format(date),
        "%H": pad(date.getHours()),
        "%I": pad(date.getHours() % 12 || 12),
        "%M": pad(date.getMinutes()),
        "%S": pad(date.getSeconds()),
        "%Y": date.getFullYear(),
        "%a": new Intl.DateTimeFormat(locale, {weekday: "short"}).format(date),
        "%b": new Intl.DateTimeFormat(locale, {month: "short"}).format(date),
        "%d": pad(date.getDate()),
        "%m": pad(date.getMonth() + 1),
        "%p": date.getHours < 12 ? "am" : "pm",
        "%y": pad(date.getFullYear() % 100),
    };

    return format.replace(/%A|%B|%H|%I|%M|%S|%Y|%a|%b|%d|%m|%p|%y/g, (match) => tokens[match]);
}

export function formatItem(item, commentString) {
    const result = {
        withComment: item,
        withoutComment: item,
    };
    if (commentString && item.includes(commentString)) {
        const [cleanedValue, comment] = item.split(commentString);
        if (comment.toLowerCase().includes(STRFTIME_MARKER)) {
            const formattedValue = strftime(cleanedValue);
            result.withoutComment = formattedValue;
            result.withComment = formattedValue + commentString + comment;
        } else {
            result.withoutComment = cleanedValue;
        }
    }

    return result;
}

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
