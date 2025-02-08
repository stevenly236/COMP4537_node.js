const MESSAGES = require("./lang/messages/en/user.js");

const http = require("http");
const url = require("url");

class DictionaryAPI {
    constructor() {
        this.dictionary = [];
        this.requestCount = 0;
    }

    handleRequest(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }

        this.requestCount++;
        const parsedUrl = url.parse(req.url, true);
        const path = parsedUrl.pathname;
        const method = req.method;

        res.setHeader("Content-Type", "application/json");

        if (method === "GET" && path === "/api/definitions/") {
            this.getDefinition(parsedUrl.query, res);
        } else if (method === "POST" && path === "/api/definitions") {
            this.addDefinition(req, res);
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ message: "Endpoint not found" }));
        }
    }

    getDefinition(query, res) {
        if (!query.word || /[^a-zA-Z\s]/.test(query.word)) {
            res.writeHead(400);
            res.end(JSON.stringify({ message: MESSAGES.invalidInput }));
            return;
        }

        const word = query.word.toLowerCase();
        const entry = this.dictionary.find(item => item.word.toLowerCase() === word);

        if (entry) {
            res.writeHead(200);
            res.end(JSON.stringify({
                message: `Request# ${this.requestCount}, ${entry.word}: ${entry.definition}`
            }));
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ message: `Request# ${this.requestCount}, ${MESSAGES.wordNotFound}` }));
        }
    }

    addDefinition(req, res) {
        let body = "";
        req.on("data", chunk => { body += chunk.toString(); });

        req.on("end", () => {
            try {
                const { word, definition } = JSON.parse(body);

                if (!word || !definition || /[^a-zA-Z\s]/.test(word)) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ message: MESSAGES.invalidInput }));
                    return;
                }

                if (this.dictionary.some(item => item.word.toLowerCase() === word.toLowerCase())) {
                    res.writeHead(409);
                    res.end(JSON.stringify({ message: `${MESSAGES.wordExists} '${word}'` }));
                    return;
                }

                this.dictionary.push({ word, definition });

                res.writeHead(201);
                res.end(JSON.stringify({
                    message: `Request# ${this.requestCount}, Total Entries: ${this.dictionary.length}, ${MESSAGES.entryAdded} "${word}: ${definition}"`
                }));

            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ message: MESSAGES.invalidJson }));
            }
        });
    }
}

const dictionaryAPI = new DictionaryAPI();

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => dictionaryAPI.handleRequest(req, res));

server.listen(PORT, () => console.log("Server is running on port 3000"));
