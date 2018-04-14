'use strict';
/* eslint-env node, mocha */

require('chai').should();
const WpaCli = require('../');

describe('WpaCli P2P Tests', function () {

    describe('Search for peer', function () {
        let wpa = new WpaCli('p2p0');
        it('should find peers on network', function (done) {
            wpa.connect().then(function () {
                wpa.once('peer_found', function (peer) {
                    peer.should.be.a('object');
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
                wpa.once('peer_found', function (peer) {
                    wpa.once('peer_connected', function () {
                        done();
                    });
                    wpa.peerConnectPBC(peer.deviceAddress, false);
                }).peerFind();
            }).catch(function (err) {
                done(err);
            });
        }).timeout(50000);
    });
});
