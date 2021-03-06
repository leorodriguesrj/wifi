'use strict';
/* eslint-env node, mocha */

require('chai').should();
const WpaCtrl = require('../');
let wpa = new WpaCtrl('wlan0');

describe('WpaCtrl AP connection Tests', function() {
    describe('connect to wpa', function() {
        it('should emit an connect to AP', function(done) {
            wpa.once('CTRL-EVENT-CONNECTED', function() {
                done();
            });

            wpa.connect().then(function () {
                let ssid = process.env.SSID || 'ssid';
                let psk = process.env.PSK || 'password';

                wpa.addNetwork();
                wpa.setNetworkSSID(0, ssid);
                return wpa.setNetworkPreSharedKey(0, psk, ssid);
            }).then(function () {
                wpa.enableNetwork(0);
                wpa.selectNetwork(0);
                return wpa.reassociate();
            }).catch(function (err) {
                done(err);
            });
        }).timeout(5000);

    });
});
describe('WpaCtrl AP disconnection Tests', function() {
    describe('connect to wpa', function() {
        it('should emit an disconnect from AP', function(done) {
            wpa.once('CTRL-EVENT-DISCONNECTED', function() {
                done();
            });

            wpa.connect().then(function () {
                return wpa.disconnectAP();
            }).catch(function (err) {
                done(err);
            });
        }).timeout(1000);
    });
});
