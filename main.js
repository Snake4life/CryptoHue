const config = require('./config');
const log = require('./utils/log');
const electron = require('electron');
const app = electron.app;
const userDataPath = app.getPath('userData');
const ipcMain = electron.ipcMain;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
const path = require('path');
const url = require('url');
const fs = require('fs');
const request = require('request');
const util = require('util');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 300,
        height: 450,
        resizable: false,
        title: 'CryptoHue',
        icon: path.join(__dirname, 'img', 'icon', 'icon.icns'),
        titleBarStyle: 'hidden'
    });

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    const menu = Menu.buildFromTemplate([{}]);
    Menu.setApplicationMenu(menu);
    mainWindow.setMenu(null);

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});

//connect to bridge
ipcMain.on('connect', event => {

    request({
        url: `http://${config.hue_ip}/api`,
        method: 'POST',
        json: {
            "devicetype": "my_hue_app#Crypto Hue"
        }
    }, (err, resp, body) => {

        if (err) {

            event.sender.send('failed to connect to hue bridge');
            log.error(util.inspect(err));

        } else {

            event.sender.send('found hue bridge');
            log.warning('Go press Hue Bridge button in the next 30 seconds');

            setTimeout(post, 30000);

        }
    });

    function post() {

        request({
            url: `http://${config.hue_ip}/api`,
            method: 'POST',
            json: {
                "devicetype": "my_hue_app#Crypto Hue"
            }
        }, (err, resp, body) => {

            if (err) {

                event.sender.send('failed to connect to hue bridge');
                log.error(util.inspect(err));

            } else {

                let response = body[0];

                if (Object.keys(response)[0] == 'error') {

                    event.sender.send('failed to connect to hue bridge');
                    log.error('Error connecting to Hue Bridge');

                } else {

                    event.sender.send('connected to hue bridge');
                    log.success(`Created Hue API username: ${response.success.username}`);

                    config.hue_token = response.success.username;

                    fs.writeFile('./config.json', JSON.stringify(config, null, 4), err => {

                        if (err) {

                            log.error(util.inspect(err));

                        } else {

                            log.success(`Hue API username saved to settings`);

                        }

                    });

                }
            }
        });
    }
});

//check connetion to hue bridge
ipcMain.on('check connection to hue bridge', (event, username) => {

    request({
        url: `http://${config.hue_ip}/api/${username}`,
        method: 'GET',
    }, (err, resp, body) => {

        if (err) {

            log.error(util.inspect(err));

        } else {

            if (body.indexOf('lights') !== -1) {

                event.sender.send('connected to hue bridge');

            }
        }

    });

});

//save settings
ipcMain.on('submit', (event, blockfolio_token, hue_ip) => {

    config.blockfolio_token = blockfolio_token;
    config.hue_ip = hue_ip;

    fs.writeFile('./config.json', JSON.stringify(config, null, 4), err => {

        if (err) {

            log.error(util.inspect(err));

        } else {

            log.success('Settings updated');

        }

    });

});

//start stop
let on = false;

ipcMain.on('start', event => {

    on = true;

    fetchBlockfolio(); //check at start

    setInterval(fetchBlockfolio, 30000); //check every 30 seconds after start

    log.success('Started');

});

ipcMain.on('stop', event => {

    on = false

    log.warning('Stopped');

});

function fetchBlockfolio() {

    if (!on) return;

    log.info('Fetching from Blockfolio API...');

    request({
        url: `https://api-v0.blockfolio.com/rest/get_all_positions/${config.blockfolio_token}?fiat_currency=USD&locale=en-US&use_alias=true`
    }, (err, resp, body) => {

        if (err) {

            log.error(util.inspect(err));

        } else {

            if (body.charAt(0) == '<') {

                log.error('Error fetching from Blockfolio API');

            } else {

                let response = JSON.parse(body);

                let sign = response.portfolio.percentChangeFiat.charAt(0);
                let percentChange = response.portfolio.percentChangeFiat.substring(1, 5);

                mainWindow.webContents.send('portfolioChange', response.portfolio.percentChangeFiat);
                log.info(`Portfolio 24 hour change: ${response.portfolio.percentChangeFiat}`);

                let bri;
                let hue;

                sign == '+' ? hue = 25500 : hue = 0;

                bri = Math.round(Math.min(254, percentChange * 30));

                log.info(`Updating lights to hue: ${hue} and brightness: ${bri}`);

                request({
                    url: `http://${config.hue_ip}/api/${config.hue_token}/groups/1/action`,
                    method: 'PUT',
                    json: {
                        "on": true,
                        "hue": hue,
                        "bri": bri,
                        "sat": 254
                    }
                }, (err, resp, body) => {

                    if (err) {

                        log.error(util.inspect(err));

                    } else {

                        log.success('Lights updated');

                    }

                });

            }
        }
    });
}
