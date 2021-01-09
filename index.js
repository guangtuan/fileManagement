const walk = require('walk');
const path = require('path');
const md5File = require('md5-file');
const R = require('ramda');
const write = require('./toFile');
const writeReport = write(path.join(__dirname, 'report.json'));
const writeRmStatement = write(path.join(__dirname, 'rm.sh'));

const debug = obj => {
    console.log(JSON.stringify(obj, null, 4));
    return obj;
};

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
        this.size = size;
        this.humanFileSize = humanFileSize(size);
    }
};

const result = [];

const totalHolder = {
    size: 0
};

const printProgress = ({ result, totalHolder }) => {
    console.log("current file count: ", result.length);
    console.log("file total size: ", humanFileSize(totalHolder.size));
};

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
            totalHolder.size += fileStats.size;
            if (result.length % 10 === 0) {
                printProgress({ result, totalHolder });
            }
            next();
        },
        errors: function (root, nodeStatsArray, next) {
            next();
        }
    }
};

const destPath = process.argv[2];

walk.walkSync(destPath, options);

printProgress({ result, totalHolder });

const repeat = Object.entries(R.groupBy(R.prop('hash'))(result)).filter(([hash, list]) => list.length > 1);

writeReport(JSON.stringify(
    {
        message: `total repeat item: ${repeat.length}`,
        detail: result
    },
    null,
    4
));

const rmStatment = R.compose(
    R.join("\n"),
    R.map(fullPath => `rm ${fullPath}`),
    R.map(R.prop('fullPath')),
    R.flatten,
    R.map(R.compose(R.remove(0, 1), R.last))
)(repeat);

writeRmStatement(rmStatment);

const saveSizeReport = R.compose(
    humanFileSize,
    R.reduce(R.add, 0),
    R.map(R.prop('size')),
    R.flatten,
    R.map(R.compose(R.remove(0, 1), R.last))
)(repeat);

console.log('totally save', saveSizeReport);