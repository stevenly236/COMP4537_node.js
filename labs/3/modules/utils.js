// modules/utils.js
const messages = require('../lang/en/en.js');

function getDate(name) {
    const currentTime = new Date().toString(); 
    const message = messages.GREETING.replace('%1', name).replace('%2', currentTime);
    return `<p style="color:blue;">${message}</p>`; 
}

module.exports = { getDate };
