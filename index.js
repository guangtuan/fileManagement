const walk = require('walk');
const fs = require('fs');
const path = require('path');
const md5File = require('md5-file');
const R = require('ramda');

function humanFileSize(bytes, si = false, dp = 1) {
    const thresh = si ? 1000 : 1024;

    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }

    const units = si
        ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    let u = -1;
    const r = 10 ** dp;

    do {
        bytes /= thresh;
        ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


    return bytes.toFixed(dp) + ' ' + units[u];
}

class ResultObject {
    constructor({ fullPath, hash, size }) {
        this.fullPath = fullPath;
        this.hash = hash;
        this.humanFileSize = humanFileSize(size);
    }
};

const result = [];

const options = {
    listeners: {
        names: function (root, nodeNamesArray) {
            nodeNamesArray.sort(function (a, b) {
                if (a > b) return 1;
                if (a < b) return -1;
                return 0;
            });
        },
        directories: function (root, dirStatsArray, next) {
            // dirStatsArray is an array of `stat` objects with the additional attributes
            // * type
            // * error
            // * name
            next();
        },
        file: function (root, fileStats, next) {
            // doStuff
            const fullPath = path.join(root, fileStats.name);
            const hash = md5File.sync(fullPath);
            result.push(new ResultObject({
                fullPath,
                hash,
                size: fileStats.size
            }));
            next();
        },
        errors: function (root, nodeStatsArray, next) {
            next();
        }
    }
};

const destPath = process.argv[2];

walk.walkSync(destPath, options);

// console.table(result);

const repeat = Object.entries(R.groupBy(R.prop('hash'))(result)).filter(([hash, list]) => list.length > 1);

console.log(
    JSON.stringify(repeat, null, 4)
);