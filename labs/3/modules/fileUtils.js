const fs = require('fs');
const path = require('path');

function appendToFile(fileName, text) {
    const filePath = path.join(__dirname, '..', fileName);

    return new Promise((resolve, reject) => {
        fs.appendFile(filePath, `${text}\n`, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function readFile(fileName) {
    const filePath = path.join(__dirname, '..', fileName);

    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    reject(new Error(`File "${fileName}" does not exist.`));
                } else {
                    reject(err);
                }
            } else {
                resolve(data);
            }
        });
    });
}

module.exports = { appendToFile, readFile };
