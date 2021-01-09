const fs = require('fs');

const write = destPath => content => {
    return fs.writeFileSync(destPath, content);
};

module.exports = write;