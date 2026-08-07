import {readFile} from "node:fs/promises";
import {createServer} from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";

const PORT = 4_173;
const FIXTURES_DIRECTORY = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "pages",
);

const server = createServer(async (request, response) => {
    try {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const fileName = url.pathname === "/" ? "static.html" : url.pathname.slice(1);
        if (!/^[a-z-]+\.html$/.test(fileName)) {
            response.writeHead(404);
            response.end("Not found");
            return;
        }

        const body = await readFile(path.join(FIXTURES_DIRECTORY, fileName));
        response.writeHead(200, {
            "Cache-Control": "no-store",
            "Content-Type": "text/html; charset=utf-8",
        });
        response.end(body);
    } catch (_error) {
        response.writeHead(404);
        response.end("Not found");
    }
});

server.listen(PORT, "127.0.0.1");
