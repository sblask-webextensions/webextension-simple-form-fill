import {test as base, chromium} from "@playwright/test";
import path from "node:path";
import {fileURLToPath} from "node:url";

const EXTENSION_PATH = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../dist-chrome",
);

export const DEFAULT_OPTIONS = {
    autocompleteEnabled: false,
    commentString: "",
    contextmenuEnabled: true,
    items: "Alpha\nBeta\nGamma",
    matchOnlyAtBeginning: false,
    minimumCharacterCount: 1,
    syncItems: false,
    useTabToChooseItems: false,
};

export const test = base.extend({
    context: async ({browserName: _browserName, headless}, use) => {
        const context = await chromium.launchPersistentContext("", {
            args: [
                `--disable-extensions-except=${EXTENSION_PATH}`,
                `--load-extension=${EXTENSION_PATH}`,
            ],
            channel: "chromium",
            headless,
            slowMo: headless ? 0 : 2000,
        });
        await use(context);
        await context.close();
    },
    extensionId: async ({serviceWorker}, use) => {
        await use(new URL(serviceWorker.url()).host);
    },
    serviceWorker: async ({context}, use) => {
        let [serviceWorker] = context.serviceWorkers();
        if (!serviceWorker) {
            serviceWorker = await context.waitForEvent("serviceworker");
        }
        await serviceWorker.evaluate(async (optionKeys) => {
            for (let attempt = 0; attempt < 100; attempt += 1) {
                const options = await browser.storage.local.get(optionKeys);
                if (optionKeys.every((key) => options[key] !== undefined)) {
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, 10));
            }
            throw new Error("Extension option initialization timed out");
        }, Object.keys(DEFAULT_OPTIONS));
        await use(serviceWorker);
    },
});

export {expect} from "@playwright/test";

export async function setExtensionOptions(serviceWorker, overrides = {}) {
    await writeExtensionOptions(serviceWorker, {
        ...DEFAULT_OPTIONS,
        ...overrides,
    });
}

export async function updateExtensionOptions(serviceWorker, updates) {
    await writeExtensionOptions(serviceWorker, updates);
}

export async function terminateServiceWorker(context, page, extensionId) {
    const session = await context.newCDPSession(page);
    try {
        const {targetInfos} = await session.send("Target.getTargets");
        const serviceWorkerTarget = targetInfos.find(({type, url}) => (
            type === "service_worker"
            && url.startsWith(`chrome-extension://${extensionId}/`)
        ));
        if (!serviceWorkerTarget) {
            throw new Error("Could not find the extension service worker target");
        }

        const {success} = await session.send("Target.closeTarget", {
            targetId: serviceWorkerTarget.targetId,
        });
        if (!success) {
            throw new Error("Could not terminate the extension service worker");
        }
    } finally {
        await session.detach();
    }
}

async function writeExtensionOptions(serviceWorker, options) {
    await serviceWorker.evaluate(async (newOptions) => {
        await browser.storage.local.set(newOptions);
        await new Promise((resolve) => setTimeout(resolve, 100));
    }, options);
}

export async function sendMessageToTab(serviceWorker, page, message) {
    await serviceWorker.evaluate(async ({messageToSend, tabUrl}) => {
        const tabs = await browser.tabs.query({});
        const tab = tabs.find(({url}) => url === tabUrl);
        if (!tab) {
            throw new Error(`Could not find tab for ${tabUrl}`);
        }
        await browser.tabs.sendMessage(tab.id, messageToSend);
    }, {
        messageToSend: message,
        tabUrl: page.url(),
    });
}
