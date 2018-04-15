'use strict';
/* eslint-env node, mocha */

require('chai').should();
const WpaCli = require('../');

describe('WpaCli P2P Tests', function () {

    describe('Search for peer', function () {
        let wpa = new WpaCli('p2p0');
        it('should find peers on network', function (done) {
            wpa.connect().then(function () {
                wpa.once('P2P-DEVICE-FOUND', function (params) {
                    params.deviceAddress.should.be.a('string');
                    done();
                }).peerFind();
            }).catch(function (err) {
                done(err);
            });
        }).timeout(5000);
    });
    describe('connect to peer', function () {
        let wpa = new WpaCli('p2p0');
        it('should connect to peer', function (done) {
            wpa.connect().then(function () {
                wpa.once('P2P-DEVICE-FOUND', function (params) {
                    wpa.once('P2P-GROUP-STARTED', function () {
                        done();
                    });
                    wpa.peerConnectPBC(params.deviceAddress, false);
                }).peerFind();
            }).catch(function (err) {
                done(err);
            });
        }).timeout(50000);
    });
});
