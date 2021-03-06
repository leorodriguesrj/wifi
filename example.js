'use strict';

const WpaCtrl = require('./');
let wpa = new WpaCtrl('wlan0');

wpa.on('raw_msg', function(msg) {
    console.log(msg);
});

wpa.connect().then(function () {
    console.log('ready');

    return wpa.listNetworks();
}).then(function (networks) {
    console.log(networks);

    return wpa.scan();
}).then(function (accessPoints) {
    console.log(accessPoints);

    wpa.addNetwork();
    wpa.setNetworkSSID(0, 'ssid');
    wpa.setNetworkPreSharedKey(0, 'password');
    wpa.enableNetwork(0);
    return wpa.selectNetwork(0);
}).then(function () {
    wpa.close();
}).catch(function (err) {
    console.log(err);
});
