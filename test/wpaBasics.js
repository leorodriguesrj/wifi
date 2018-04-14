'use strict';
/* eslint-env node, mocha */

require('chai').should();
const WpaCli = require('../');

describe('WpaCli Basic Tests', function () {
    describe('connect to wpa', function () {
        it('should connect', function (done) {
            let wpa = new WpaCli('wlan0');

            wpa.connect().then(function () {
                done();
            }).catch(function (err) {
                done(err);
            });
        }).timeout(5000);

        it('should emit an list_network event', function (done) {
            let wpa = new WpaCli('wlan0');

            wpa.connect().then(function () {
                return wpa.listNetworks();
            }).then(function (results) {
                results.should.be.a('array');
                done();
            }).catch(function (err) {
                done(err);
            });
        }).timeout(2000);

        it('should emit an status event', function (done) {
            let wpa = new WpaCli('wlan0');

            wpa.connect().then(function () {
                return wpa.status();
            }).then(function (result) {
                result.should.be.a('object');
                done();
            }).catch(function (err) {
                done(err);
            });
        }).timeout(2000);

        it('should emit an scan_results event', function (done) {
            let wpa = new WpaCli('wlan0');

            wpa.connect().then(function () {
                return wpa.scan();
            }).then(function (results) {
                results.should.be.a('array');
                done();
            }).catch(function (err) {
                done(err);
            });
        }).timeout(5000);

        it('should emit an raw_msg event', function (done) {
            let wpa = new WpaCli('wlan0');

            wpa.once('raw_msg', function (msg) {
                msg.should.be.a('string');
                done();
            });

            wpa.connect().then(function () {
                return wpa.scan();
            }).catch(function (err) {
                done(err);
            });
        }).timeout(5000);

    });
});
