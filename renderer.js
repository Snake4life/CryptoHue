const config = require('./config');
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer;
const $ = require('jquery');

$(document).ready(() => {

    $('#blockfolio_token').val(config.blockfolio_token);
    $('#hue_ip').val(config.hue_ip);

    ipcRenderer.send('check connection to hue bridge', config.hue_token);

});

$('#connect').click(() => {

    ipcRenderer.send('connect');

});

ipcRenderer.on('failed to connect to hue bridge', event => {

    console.log('Failed connecting to Hue Bridge.');

    $('#connectStatus').text('Failed connecting to Hue Bridge.');

});

ipcRenderer.on('found hue bridge', event => {

    console.log('go hit button');

    $('#connectStatus').text('Press button on Hue Bridge in the next 30 seconds.');

});

ipcRenderer.on('connected to hue bridge', event => {

    console.log('connected to hue api');

    $('#connectStatus').text('Connected to Hue Bridge!');

    $('#connect').prop('disabled', true);

});

$('#submit').click(() => {

    ipcRenderer.send('submit', $('#blockfolio_token').val(), $('#hue_ip').val());

    $('#submit').prop('disabled', true);

});

$('input').change(() => {

    $('#submit').prop('disabled', false);
    $('#connect').prop('disabled', false);

});

$('#start').click(() => {

    ipcRenderer.send('start');

    $('#start').prop('disabled', true);
    $('#stop').prop('disabled', false);

});

$('#stop').click(() => {

    ipcRenderer.send('stop');

    $('#start').prop('disabled', false);
    $('#stop').prop('disabled', true);

});

ipcRenderer.on('portfolioChange', (event, change) => {

    $('#portfolioChange').text(change);

    if (change.charAt(0) == '+') {

        $('#portfolioChange').attr('class', 'positive');

    } else if (change.charAt(0) == '-') {

        $('#portfolioChange').attr('class', 'negative');

    }
    
});
