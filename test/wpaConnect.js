'use strict';
/* eslint-env node, mocha */

require('chai').should();
const WpaCli = require('../');
let wpa = new WpaCli('wlan0');

describe('WpaCli AP connection Tests', function() {
    describe('connect to wpa', function() {
        it('should emit an connect to AP', function(done) {
            wpa.once('ap_connected', function() {
                done();
            });

            wpa.connect().then(function () {
                wpa.addNetwork();
                wpa.setSSID(0, 'ssid');
                wpa.setPreSharedKey(0, 'password');
                wpa.enableNetwork(0);
                return wpa.selectNetwork(0);
            }).catch(function (err) {
                done(err);
            });
        }).timeout(1000);

    });
});
describe('WpaCli AP disconnection Tests', function() {
    describe('connect to wpa', function() {
        it('should emit an disconnect from AP', function(done) {
            wpa.once('ap_disconnected', function() {
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
