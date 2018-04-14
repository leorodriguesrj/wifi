'use strict';

const unix = require('unix-dgram');
const EventEmitter = require('events').EventEmitter;
const exec = require('child_process').exec;
const path = require('path');
const unlinkSync = require('fs').unlinkSync;
const pbkdf2 = require('crypto').pbkdf2;
const spawnSync = require('child_process').spawnSync;

/*
    WPA_CLI commands
 */
const WPA_CMD = {
    listInterfaces: 'ifconfig',
    attach: 'ATTACH',
    scan: 'SCAN',
    scanResult: 'SCAN_RESULTS',
    addNetwork: 'ADD_NETWORK',
    listNetwork: 'LIST_NETWORKS',
    setNetwork: 'SET_NETWORK :id :key :value',
    status: 'STATUS',
    enableNetwork: 'ENABLE_NETWORK :id',
    selectNetwork: 'SELECT_NETWORK :id',
    disconnectAP: 'DISCONNECT',
    peerSearch: 'P2P_FIND',
    peerStopSearch: 'P2P_STOP_FIND',
    peerConnect: 'P2P_CONNECT :peer_addr :auth_type :pin :owner_params',
    peerInfo: 'P2P_PEER :peer_addr',
    peerInvite: 'P2P_INVITE',
    removeVirtIface: 'P2P_GROUP_REMOVE :iface',
    flushPeers: 'P2P_FLUSH',
    saveConfig: 'SAVE_CONFIG',
    reconfigure: 'RECONFIGURE',
    reassociate: 'REASSOCIATE'
};

/**
 * WpaCli to control wpa_supplicant
 * 
 * @emits WpaCli#scanning
 * @emits WpaCli#ap_connected
 * @emits WpaCli#ap_disconnected
 * @emits WpaCli#peer_found
 * @emits WpaCli#peer_invitation_received
 * @emits WpaCli#peer_connected
 * @emits WpaCli#peer_disconnected
 * @emits WpaCli#raw_msg
 */
class WpaCli extends EventEmitter {
    /**
     * constructs WpaCli
     * @param {string} ifName interface name eg. wlan0
     * @param {string} [ctrlPath='/run/wpa_supplicant'] - The location of the wpa_supplicant control interface.
     */
    constructor(ifName, ctrlPath = '/run/wpa_supplicant') {
        super();
        this.ifName = ifName;
        this.socketPath = path.join(ctrlPath, ifName);
        this.client = unix.createSocket('unix_dgram');
        this.clientPath = '/tmp/wpa_ctrl' + Math.random().toString(36).substr(1);
    }

    /**
     * connect to wpa control interface
     * @returns {Promise}
     */
    connect() {
        return new Promise((resolve, reject) => {
            this.client.on('message', this._onMessage.bind(this));
            this.client.on('congestion', this._onCongestion.bind(this));
            this.client.once('connect', () => {
                this.client.bind(this.clientPath);
            });
            this.client.once('listening', () => {
                this.sendCmd(WPA_CMD.attach);
                resolve();
            });
            this.client.once('error', (err) => {
                reject(err);
            });
            this.client.connect(this.socketPath);
        });
    }

    /**
     * close the wpa control interface
     */
    close() {
        this.client.close();
        this.client = null;
        unlinkSync(this.clientPath);
    }

    /**
     * message event handler
     * @private
     * @param  {Buffer} msg message recieved from wpa_ctrl
     */
    _onMessage(msg) {
        msg = msg.toString();
        this._onRawMsg(msg);
        switch (true) {
        case 'OK\n' === msg:
            this.cmdResolve && this.cmdResolve();
            break;
        case 'FAIL\n' === msg:
            this.cmdReject && this.cmdReject();
            break;
        case /^\d+\n$/.test(msg):
            this.cmdResolve && this.cmdResolve(+msg);
            break;
        case /<\d+>/.test(msg):
            this._onCtrlEvent(msg.toString());
            break;
        case /bssid \/ frequency \/ signal level \/ flags \/ ssid/.test(msg):
            this._onScanResult(msg);
            break;
        case /network id \/ ssid \/ bssid \/ flags/.test(msg):
            this._onListNetwork(msg);
            break;
        case /p2p_device_address=\w{2}:\w{2}:\w{2}:\w{2}:\w{2}:\w{2}\naddress=\w/.test(msg):
            this._onStatus(msg);
            break;
        case /\w{2}:\w{2}:\w{2}:\w{2}:\w{2}:\w{2}\npri_dev_type=\w/.test(msg):
            this._onPeerInfo(msg);
            break;
        }
    }

    /**
     * control event handler
     * @private
     * @param  {string} msg control event messages
     */
    _onCtrlEvent(msg) {
        switch (true) {
        case /CTRL-EVENT-SCAN-STARTED/.test(msg):
            this.emit('scanning');
            break;
        case /CTRL-EVENT-SCAN-RESULTS/.test(msg):
            if (this.scanResolve != null) {
                this.scanResults().then((scanResults) => {
                    this.scanResolve && this.scanResolve(scanResults);
                }).catch((err) => {
                    this.scanReject && this.scanReject(err);
                });
            }
            break;
        case /CTRL-EVENT-CONNECTED/.test(msg):
            this._onApConnected(msg);
            break;
        case /CTRL-EVENT-DISCONNECTED/.test(msg):
            this._onApDisconnected(msg);
            break;
        case /P2P-DEVICE-FOUND/.test(msg):
            this._onNewPeerFound(msg);
            break;
        case /P2P-DEVICE-LOST/.test(msg):
            this._onPeerDisconnect(msg);
            break;
        case /P2P-GROUP-STARTED/.test(msg):
            this._onPeerConnected(msg);
            break;
        case /P2P-INVITATION-RECEIVED/.test(msg):
            this._onPeerInvitation(msg);
            break;
        }
    }

    /**
     * congestion event handler
     * @private
     * @param  {string} err congestion error message
     */
    _onCongestion(err) {
        console.log('congestion', err);
    }

    /**
     * send request to wpa_cli
     * @param  {string} msg wpa_cli commands
     * @returns {Promise}
     */
    sendCmd(msg) {
        this.cmdPromise = (this.cmdPromise || Promise.resolve()).then(() => {
            return new Promise((resolve, reject) => {
                this.cmdResolve = resolve;
                this.cmdReject = reject;
                this.client.send(new Buffer(msg));
            });
        });

        this.cmdPromise.then(() => {
            this.cmdResolve = null;
            this.cmdReject = null;
        }).catch(() => {
            this.cmdResolve = null;
            this.cmdReject = null;
        });

        return this.cmdPromise;
    }

    /**
     * scan for wifi AP
     * @returns {Promise}
     */
    scan() {
        this.scanPromise = (this.scanPromise || Promise.resolve()).then(() => {
            return new Promise((resolve, reject) => {
                this.scanResolve = resolve;
                this.scanReject = reject;
                this.sendCmd(WPA_CMD.scan).catch((err) => {
                    reject(err);
                });
            });
        });

        this.scanPromise.then(() => {
            this.scanResolve = null;
            this.scanReject = null;
        }).catch(() => {
            this.scanResolve = null;
            this.scanReject = null;
        });

        return this.scanPromise;
    }

    /**
     * request for wifi scan results
     * @returns {Promise}
     */
    scanResults() {
        return this.sendCmd(WPA_CMD.scanResult);
    }

    /**
     * scan results handler
     * @private
     * @param  {string} msg scan results message
     */
    _onScanResult(msg) {
        function parseFlags(flags) {
            const CIPHER = '(?:CCMP-256|GCMP-256|CCMP|GCMP|TKIP|NONE)';
            const KEY_MGMT = '(?:EAP|PSK|None|SAE|FT/EAP|FT/PSK|FT/SAE|EAP-SHA256|PSK-SHA256|EAP-SUITE-B|EAP-SUITE-B-192|OSEN)';
            const PROTO = '(WPA|RSN|WPA2|OSEN)';
            const CRYPTO_FLAG = new RegExp(`${PROTO}-(?:(${KEY_MGMT}(?:\\+${KEY_MGMT})*)-(${CIPHER}(?:\\+${CIPHER})*)(-preauth)?|\\?)`);

            return flags.substr(1, flags.length - 2).split('][').map((e) => {
                let match = e.match(CRYPTO_FLAG);
                if (match != null) {
                    let keyMgmt = (match[2] != null) ? match[2].split('+') : undefined;
                    let cipher = (match[3] != null) ? match[3].split('+') : undefined;
                    return { proto: match[1], keyMgmt, cipher, preauth: (match[4] != null) };
                } else {
                    return e;
                }
            });
        }

        if (this.cmdResolve != null) {
            msg = msg.split('\n');
            msg.splice(0, 1);
            let scanResults = [];
            msg.forEach(function (line) {
                if (line.length > 3) {
                    line = line.split('\t');
                    scanResults.push({
                        bssid: line[0].trim(),
                        freq: +line[1].trim(),
                        rssi: +line[2].trim(),
                        flags: parseFlags(line[3].trim()),
                        ssid: line[4].trim()
                    });
                }
            });
            this.cmdResolve(scanResults);
        }
    }

    /**
     * raw message handler from wpa_cli, captures all messages by default for debuging purposes
     * @private
     * @param  {string} msg wpa messages
     */
    _onRawMsg(msg) {
        this.emit('raw_msg', msg);
    }

    /**
     * list network handler, list all configured networks or devices
     * @private
     * @param  {string} msg network or devices list
     */
    _onListNetwork(msg) {
        if (this.cmdResolve != null) {
            msg = msg.split('\n');
            msg.splice(0, 1);
            let networkResults = [];
            msg.forEach(function (line) {
                if (line.length > 3) {
                    line = line.split('\t');
                    let flags = (line[3] || '[]').trim();
                    flags = flags.substr(1, flags.length - 1).split('][');
                    networkResults.push({
                        networkId: +line[0].trim(),
                        ssid: line[1].trim(),
                        bssid: line[2].trim(),
                        flags: flags
                    });
                }
            });
            this.cmdResolve(networkResults);
        }
    }

    /**
     * add new network
     * @returns {Promise}
     */
    addNetwork() {
        return this.sendCmd(WPA_CMD.addNetwork);
    }

    /**
     * request to list networks
     * @returns {Promise}
     */
    listNetworks() {
        return this.sendCmd(WPA_CMD.listNetwork);
    }

    /**
     * request for status
     * @returns {Promise}
     */
    status() {
        return this.sendCmd(WPA_CMD.status);
    }

    /**
     * status handler, parses status messages and emits status event
     * @private
     * @param  {string} msg status message
     * @returns {Promise}
     */
    _onStatus(msg) {
        if (this.cmdResolve) {
            msg = msg.split('\n');
            let status = {};
            msg.forEach(function (line) {
                if (line.length > 3) {
                    line = line.split('=');
                    status[line[0]] = line[1];
                }
            });
            this.cmdResolve(status);
        }
    }

    /**
     * set network variable
     * 
     * @param {number} networkId network id recieved from list networks
     * @param {string} variable variable to set
     * @param {string} value value for the variable
     * @returns {Promise}
     */
    setNetworkVariable(networkId, variable, value) {
        return this.sendCmd(WPA_CMD.setNetwork.replace(':id', networkId).replace(':key', variable).replace(':value', value));
    }

    /**
     * set network ssid
     * @param {number} networkId network id recieved from list networks
     * @param {string} ssid ssid of the network
     * @returns {Promise}
     */
    setNetworkSSID(networkId, ssid) {
        return this.setNetworkVariable(networkId, 'ssid', `"${ssid}"`);
    }

    /**
     * set network pre-shared key
     * @param {number} networkId networkId network id recieved from list networks
     * @param {string} preSharedKey  pre-shared key
     * @param {string} ssid  ssid of the network
     * @returns {Promise}
     */
    setNetworkPreSharedKey(networkId, preSharedKey, ssid) {
        return new Promise((resolve, reject) => {
            pbkdf2(preSharedKey, ssid, 4096, 32, 'sha1', (err, derivedKey) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(derivedKey.toString('hex'));
                }
            });
        }).then((psk) => {
            return this.setNetworkVariable(networkId, 'psk', psk);
        });
    }

    /**
     * set network identity
     * @param {number} networkId network id recieved from list networks
     * @param {string} identity identity string for EAP
     * @returns {Promise}
     */
    setNetworkIdentity(networkId, identity) {
        return this.setNetworkVariable(networkId, 'identity', `"${identity}"`);
    }

    /**
     * set network password
     * @param {number} networkId network id recieved from list networks
     * @param {string} password password string for EAP
     * @returns {Promise}
     */
    setNetworkPassword(networkId, password) {
        let hash = spawnSync('openssl md4', { input: Buffer.from(password, 'utf16le') }).stdout.toString().trim();
        return this.setNetworkVariable(networkId, 'password', `hash:${hash}`);
    }

    /**
     * enable configured network
     * @param  {number} networkId networkId network id recieved from list networks
     * @returns {Promise}
     */
    enableNetwork(networkId) {
        return this.sendCmd(WPA_CMD.enableNetwork.replace(/:id/, networkId));
    }

    /**
     * select network to connect
     * @param  {number} networkId networkId network id recieved from list networks
     * @returns {Promise}
     */
    selectNetwork(networkId) {
        return this.sendCmd(WPA_CMD.selectNetwork.replace(/:id/, networkId));
    }

    /**
     * save the current configuration
     * 
     * @returns {Promise}
     */
    saveConfig() {
        return this.sendCmd(WPA_CMD.saveConfig);
    }

    /**
     * reload the configuration from disk
     * 
     * @returns {Promise}
     */
    reconfigure() {
        return this.sendCmd(WPA_CMD.reconfigure);
    }

    /**
     * Force reassociation
     * 
     * @returns {Promise}
     */
    reassociate() {
        return this.sendCmd(WPA_CMD.reassociate);
    }
    
    /**
     * AP connected event handler
     * @private
     */
    _onApConnected() {
        // this.startDhclient();
        this.emit('ap_connected');
    }

    /**
     * AP disconnect event handler
     * @private
     */
    _onApDisconnected() {
        // this.stopDhclient();
        this.emit('ap_disconnected');
    }

    // /**
    //  * start dhclient for interface
    //  */
    // startDhclient() {
    //     exec('sudo dhclient ' + this.ifName, (err) => {
    //         if (err) {
    //             console.log(err);
    //         } else {
    //             this.emit('ap_connected');
    //         }
    //     });
    // }

    // /**
    //  * stop dhclient for interface
    //  */
    // stopDhclient() {
    //     exec('sudo dhclient -r ' + this.ifName, (err) => {
    //         if (err) {
    //             console.log(err);
    //         }
    //     });
    //     this.emit('ap_disconnected');
    // }

    /**
     * disconnect from AP
     * @returns {Promise}
     */
    disconnectAP() {
        return this.sendCmd(WPA_CMD.disconnectAP);
    }

    /**
     * search for peers
     * @returns {Promise}
     */
    peerFind() {
        return this.sendCmd(WPA_CMD.peerSearch);
    }

    /**
     * stop peer search
     * @returns {Promise}
     */
    peerStopFind() {
        return this.sendCmd(WPA_CMD.peerStopFind);
    }

    /**
     * fetch Peer Information
     * @param  {string} peerAddress peer device address
     * @returns {Promise}
     */
    peerInfo(peerAddress) {
        let cmd = WPA_CMD.peerInfo.replace(':peer_addr', peerAddress);
        return this.sendCmd(cmd);
    }

    /**
     * connect to peer with PBC(Push Button Control) authentication mechanism
     * @param  {string}  peerAddress Mac Address of peer
     * @param  {Boolean} isOwner     Your role, are you group owner? if yes then true else false
     * @returns {Promise}
     */
    peerConnectPBC(peerAddress, isOwner) {
        let cmd = WPA_CMD.peerConnect.replace(':peer_addr', peerAddress);
        cmd = cmd.replace(':auth_type', 'pbc').replace(':pin', '');
        cmd = cmd.replace(':owner_params', (isOwner) ? 'auth go_intent=7' : '');
        return this.sendCmd(cmd);
    }

    /**
     * connect to peer with PIN(password) authentication mechanism
     * @param  {string}  peerAddress Mac Address of peer
     * @param  {string}  pin         password for authentication
     * @param  {Boolean} isOwner     Your role, are you group owner? if yes then true else false
     * @returns {Promise}
     */
    peerConnectPIN(peerAddress, pin, isOwner) {
        let cmd = WPA_CMD.peerConnect.replace(':peer_addr', peerAddress);
        cmd = cmd.replace(':auth_type', 'pin').replace(':pin', pin);
        cmd.replace(':owner_params', (isOwner) ? ' auth go_intent=7 ' : '');
        return this.sendCmd(WPA_CMD.peerConnect);
    }

    /**
     * new peer event handler
     * @private
     * @param  {string} msg event message
     * @returns {Promise}
     */
    _onNewPeerFound(msg) {
        let deviceAddressExp = /p2p_dev_addr=(\w{2}:\w{2}:\w{2}:\w{2}:\w{2}:\w{2})/g;
        let deviceNameExp = /name='(.*)'/g;
        let deviceName = deviceNameExp.exec(msg)[1];
        let deviceAddress = deviceAddressExp.exec(msg)[1];
        this.emit('peer_found', {
            deviceAddress: deviceAddress,
            deviceName: deviceName
        });
    }

    /**
     * peer disconnection event handler
     * @private
     * @param  {string} msg event message
     * @returns {Promise}
     */
    _onPeerDisconnect(msg) {
        let deviceAddressExp = /p2p_dev_addr=(\w{2}:\w{2}:\w{2}:\w{2}:\w{2}:\w{2})/g;
        let deviceAddress = deviceAddressExp.exec(msg)[1];
        this.emit('peer_disconnected', {
            deviceAddress: deviceAddress
        });
    }

    /**
     * peer info event handler
     * @private
     * @param  {string} msg event message
     * @returns {Promise}
     */
    _onPeerInfo(msg) {
        if (this.cmdResolve) {
            msg = msg.split('\n');
            let deviceAddressExp = /\w{2}:\w{2}:\w{2}:\w{2}:\w{2}:\w{2}/;
            let status = {};
            msg.forEach(function (line) {
                let deviceAddress = deviceAddressExp.exec(line);
                if (line.length > 3 && !deviceAddress) {
                    line = line.split('=');
                    status[line[0]] = line[1];
                } else if (line.length) {
                    status.address = deviceAddress[0];
                }
            });
            this.cmdResolve(status);
        }
    }

    /**
     * list network interfaces on system
     * @returns {Promise}
     */
    listInterfaces() {
        return new Promise((resolve, reject) => {
            exec(WPA_CMD.listInterfaces, function (err, stdin) {
                if (err) {
                    reject(err);
                } else {
                    let interfaceInfo = {};
                    let output = stdin.split(/\n/);
                    let currentInterface;
                    const PATTERNS = {
                        interface: /^\w{1,20}/g,
                        macAddr: /ether (([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2}))/,
                        ipaddress: /inet (\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/,
                        bcastAddr: /broadcast (\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/
                    };
                    output.forEach(function (line) {
                        switch (true) {
                        case PATTERNS.interface.test(line):
                            currentInterface = /(^\w{1,20}-\w{1,20}-\w{1,20}|^\w{1,20})/g.exec(line)[1];
                            interfaceInfo[currentInterface] = {};
                            break;
                        case PATTERNS.macAddr.test(line):
                            interfaceInfo[currentInterface].hwAddr = PATTERNS.macAddr.exec(line)[1];
                            break;
                        case PATTERNS.ipaddress.test(line):
                            if (PATTERNS.ipaddress.exec(line)) {
                                interfaceInfo[currentInterface].ipaddress = PATTERNS.ipaddress.exec(line)[1];
                            }
                            if (PATTERNS.bcastAddr.exec(line)) {
                                interfaceInfo[currentInterface].broadcastAddress = PATTERNS.bcastAddr.exec(line)[1];
                            }
                            break;
                        }
                    });
                    resolve(interfaceInfo);
                }
            });
        });
    }

    /**
     * peer connected handler
     * @private
     */
    _onPeerConnected(msg) {
        let peerInterface = /P2P-GROUP-STARTED (p2p-p2p\d{1,2}-\d{1,2})/.exec(msg)[1];
        this.emit('peer_connected', peerInterface);
    }

    /**
     * handle peer invitation event
     * @private
     * @param  {string} msg message 
     */
    _onPeerInvitation(msg) {
        let peerAddress = /bssid=(\w{1,2}:\w{1,2}:\w{1,2}:\w{1,2}:\w{1,2}:\w{1,2})/.exec(msg)[1];
        this.emit('peer_invitation_recieved', peerAddress);
    }

    /**
     * Remove virtual interface eg: p2p-p2p0-1
     * @param  {string}   iFaceName interface name
     * @param  {Function} callback  callback function
     * @returns {Promise}
     */
    removeVitualInterface(iFaceName) {
        let cmd = WPA_CMD.removeVirtIface.replace(':iface', iFaceName);
        return this.sendCmd(cmd);
    }

    /**
     * Flush peer data
     * @returns {Promise}
     */
    flushPeers() {
        let cmd = WPA_CMD.flushPeers;
        return this.sendCmd(cmd);
    }
}

module.exports = WpaCli;
