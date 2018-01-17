const chalk = require('chalk');
const moment = require('moment');

let info = message => {
    console.log(chalk.blue(`[${moment().format('hh:mm:ss')}] ${message}`));
}

let error = message => {
    console.log(chalk.red(`[${moment().format('hh:mm:ss')}] ${message}`));
}

let success = message => {
    console.log(chalk.green(`[${moment().format('hh:mm:ss')}] ${message}`));
}

let warning = message => {
    console.log(chalk.yellow(`[${moment().format('hh:mm:ss')}] ${message}`));
}

module.exports = {
    info,
    error,
    success,
    warning
}
