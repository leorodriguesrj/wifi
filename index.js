'use strict';

const unix = require('unix-dgram');
const EventEmitter = require('events').EventEmitter;
const exec = require('child_process').exec;
const path = require('path');
const unlinkSync = require('fs').unlinkSync;
const { pbkdf2, createHash } = require('crypto');

/*
    wpa_supplicant control interface commands
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
 * WpaCtrl to control wpa_supplicant
 * 
 * <h3>Install:</h3>
 * 
 * `npm install wpa-ctrl --save`
 * 
 * <h3>Note:</h3>
 * 
 * This only works on linux, tested on Debian stretch. You need to have `wpa_supplicant` installed and run as a user in the
 * `netdev` group.
 * 
 * For more examples, see the test directory for p2p and wifi connection samples. This is a very basic library, it is nessary to
 * write another wrapper over this.
 * 
 * @see {@link http://w1.fi/wpa_supplicant/devel/ctrl_iface_page.html} for full documentation of the commands that can be sent
 * and events that can be emitted.
 * @example <caption>Scan for SSIDs and connect to an wireless network.</caption>
 * 'use strict';
 * 
 * const WpaCtrl = require('wap-ctrl');
 * let wpa = new WpaCtrl('wlan0');
 * 
 * wpa.on('raw_msg', function(msg) {
 *     console.log(msg);
 * });
 * 
 * wpa.connect().then(function () {
 *     console.log('ready');
 * 
 *     return wpa.listNetworks();
 * }).then(function (networks) {
 *     console.log(networks);
 * 
 *     return wpa.scan();
 * }).then(function (accessPoints) {
 *     console.log(accessPoints);
 * 
 *     wpa.addNetwork();
 *     wpa.setNetworkSSID(0, 'ssid');
 *     wpa.setNetworkPreSharedKey(0, 'password');
 *     wpa.enableNetwork(0);
 *     return wpa.selectNetwork(0);
 * }).then(function () {
 *     wpa.close();
 * }).catch(function (err) {
 *     console.log(err);
 * });
 * 
 * @emits WpaCtrl#raw_msg
 * @emits WpaCtrl#response
 * @emits WpaCtrl#CTRL-REQ
 * @emits WpaCtrl#P2P-DEVICE-FOUND
 * @emits WpaCtrl#P2P-DEVICE-LOST
 * @emits WpaCtrl#P2P-GROUP-STARTED
 * @emits WpaCtrl#P2P-INVITATION-RECEIVED
 * @emits WpaCtrl#CTRL-EVENT-CONNECTED
 * @emits WpaCtrl#CTRL-EVENT-DISCONNECTED
 */
class WpaCtrl extends EventEmitter {
    /**
     * constructs WpaCtrl
     * @param {string} ifName interface name eg. wlan0
     * @param {string} [ctrlPath='/run/wpa_supplicant'] - The location of the wpa_supplicant control interface.
     */
    constructor(ifName, ctrlPath = '/run/wpa_supplicant') {
        super();
        this.ifName = ifName;
        this.socketPath = path.join(ctrlPath, ifName);
        this.pendingCmd = Promise.resolve();
        this.pendingScan = Promise.resolve();
    }

    /**
     * connect to wpa control interface
     * @returns {Promise}
     */
    connect() {
        if (this.client != null) {
            return Promise.resolve();
        }

        this.client = unix.createSocket('unix_dgram');
        return new Promise((resolve, reject) => {
            this.client.on('message', this._onMessage.bind(this));
            this.client.on('congestion', this._onCongestion.bind(this));
            this.client.once('error', reject);
            this.client.once('connect', () => {
                this.clientPath = '/tmp/wpa_ctrl' + Math.random().toString(36).substr(1);
                this.client.bind(this.clientPath);
            });
            this.client.once('listening', () => {
                this.sendCmd(WPA_CMD.attach);
                this.client.removeListener('error', reject);
                resolve();
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
        try {
            unlinkSync(this.clientPath);
        } catch (err) {
            console.log('Error removing client socket.', err);
        }
    }

    /**
     * message event handler
     * @private
     * @param  {Buffer} msg message recieved from wpa_ctrl
     */
    _onMessage(msg) {
        msg = msg.toString().trim();
        this.emit('raw_msg', msg);
        if (/^<\d>/.test(msg)) {
            let match = /^<\d>CTRL-REQ-/.test(msg) ? msg.match(/^<(\d)>(CTRL-REQ)-(.*)/) : msg.match(/^<(\d)>([-\w]+)\s*(.+)?/);
            let event = match[2];
            let params = { level: +match[1], raw: match[3] };

            this._addParsedEventData(event, params);
            this.emit(event, params);
        } else {
            this.emit('response', msg);
        }
    }

    /**
     * add parsed parameters to the event data object
     * @private
     * @param {string} event
     * @param {object} params
     */
    _addParsedEventData(event, params) {
        let match;
        switch (event) {
        case 'CTRL-REQ':
            match = params.raw.match(/^(\w+)-(\d+)[-:](.*)/);
            if (match != null) {
                params.field = match[1];
                params.networkId = +match[2];
                params.prompt = match[3].trim();
            }
            break;
        case 'P2P-DEVICE-FOUND':
        case 'P2P-DEVICE-LOST':
            match = params.raw.match(/p2p_dev_addr=([:xdigit:]{2}(?::[:xdigit:]{2}){5}).*(?:name='([^']*))?'/);
            if (match != null) {
                params.deviceAddress = match[1];
                params.deviceName = match[2];
            }
            break;
        case 'P2P-GROUP-STARTED':
            match = params.raw.match(/^([-\w]+)/);
            if (match != null) {
                params.peerInterface = match[1];
            }
            break;
        case 'P2P-INVITATION-RECEIVED':
            match = params.raw.match(/bssid=([:xdigit:]{2}(?::[:xdigit:]{2}){5})/);
            if (match != null) {
                params.peerAddress = match[1];
            }
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
     * send request to wpa_supplicant control interface
     * @param  {string} msg wpa_supplicant commands
     * @returns {Promise}
     */
    sendCmd(msg) {
        this.pendingCmd = this.pendingCmd.then(() => {
            return new Promise((resolve, reject) => {
                this.client.once('error', reject);
                this.once('response', (msg) => {
                    this.client.removeListener('error', reject);
                    this._parseResponse(msg, resolve, reject);
                });
                this.client.send(new Buffer(msg));
            });
        });

        return this.pendingCmd;
    }

    /**
     * parse response from wpa_supplicant control interface
     * @private
     * @param  {string} msg wpa_supplicant response
     */
    _parseResponse(msg, resolve, reject) {
        switch (true) {
        case 'OK' === msg:
            resolve();
            break;
        case 'FAIL' === msg:
            reject(new Error('WPA command failed.'));
            break;
        case /^\d+$/.test(msg):
            resolve(+msg);
            break;
        case /bssid \/ frequency \/ signal level \/ flags \/ ssid/.test(msg):
            resolve(this._parseScanResult(msg));
            break;
        case /network id \/ ssid \/ bssid \/ flags/.test(msg):
            resolve(this._parseListNetwork(msg));
            break;
        case /p2p_device_address=\w{2}:\w{2}:\w{2}:\w{2}:\w{2}:\w{2}\naddress=\w/.test(msg):
            resolve(this._parseStatus(msg));
            break;
        case /\w{2}:\w{2}:\w{2}:\w{2}:\w{2}:\w{2}\npri_dev_type=\w/.test(msg):
            resolve(this._parsePeerInfo(msg));
            break;
        default:
            resolve(msg);
            break;
        }
    }

    /**
     * scan for wifi AP
     * @returns {Promise}
     */
    scan() {
        this.pendingScan = this.pendingScan.then(() => {
            return new Promise((resolve, reject) => {
                this.once('CTRL-EVENT-SCAN-RESULTS', () => {
                    this.scanResults().then((scanResults) => {
                        resolve(scanResults);
                    }).catch(reject);
                });

                this.sendCmd(WPA_CMD.scan).catch(reject);
            });
        });

        return this.pendingScan;
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
    _parseScanResult(msg) {
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
        return scanResults;
    }

    /**
     * list network handler, list all configured networks or devices
     * @private
     * @param  {string} msg network or devices list
     */
    _parseListNetwork(msg) {
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
        return networkResults;
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
     */
    _parseStatus(msg) {
        msg = msg.split('\n');
        let status = {};
        msg.forEach(function (line) {
            if (line.length > 3) {
                line = line.split('=');
                status[line[0]] = line[1];
            }
        });
        return status;
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
        let hash = createHash('md4');
        hash.update(Buffer.from(password, 'utf16le'));
        return this.setNetworkVariable(networkId, 'password', `hash:${hash.digest('hex')}`);
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
     * peer info event handler
     * @private
     * @param  {string} msg event message
     */
    _parsePeerInfo(msg) {
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
        return status;
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

module.exports = WpaCtrl;
