const http = require('http');
const url = require('url');
const { getDate } = require('./modules/utils.js');
const { appendToFile, readFile } = require('./modules/fileUtils.js');
const messages = require('./lang/en/en.js');

class ServerApp {
    constructor(port) {
        this.port = port;
    }

    start() {
        const server = http.createServer((req, res) => this.handleRequest(req, res));
        server.listen(this.port, () => {
            console.log(`Server is running ${this.port}`);
        });
    }

    async handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        let pathname = parsedUrl.pathname.replace(/\/+$/, ''); 
        const query = parsedUrl.query;

        if (pathname === '/COMP4537/labs/3/getDate/' && query.name) {
            this.handleGetDate(query.name, res);
        } else if (pathname === '/COMP4537/labs/3/writeFile/' && query.text) {
            const decodedText = decodeURIComponent(query.text); 
            await this.handleWriteFile(decodedText, res);
        } else if (pathname === '/COMP4537/labs/3/readFile/file.txt') {
            await this.handleReadFile(res);
        } else {
            this.handleNotFound(res);
        }
    }

    handleGetDate(name, res) {
        const responseMessage = getDate(name);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(responseMessage);
    }

    async handleWriteFile(text, res) {
        try {
            await appendToFile('file.txt', text);
            const successMessage = messages.WRITE_SUCCESS.replace('%1', text);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`<p style="color:green;">${successMessage}</p>`);
        } catch (err) {
            const errorMessage = messages.WRITE_ERROR.replace('%1', err.message);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`<p style="color:red;">${errorMessage}</p>`);
        }
    }

    async handleReadFile(res) {
        try {
            const fileContent = await readFile('file.txt');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`<pre>${fileContent}</pre>`); 
        } catch (err) {
            const notFoundMessage = messages.FILE_NOT_FOUND.replace('%1', 'file.txt');
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`<p style="color:red;">${notFoundMessage}</p>`);
        }
    }

    handleNotFound(res) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`<p style="color:red;">${messages.NOT_FOUND}</p>`);
    }
}

const PORT = process.env.PORT || 8080;

const app = new ServerApp(PORT);
app.start();

// Used ChatGPT to help 