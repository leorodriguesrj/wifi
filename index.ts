import * as unix from 'unix-dgram';
import { EventEmitter } from 'events';
import { exec } from 'child_process';
import * as path from 'path';
import { unlinkSync } from 'fs';
import { pbkdf2, createHash } from 'crypto';

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
    private ifName: string;
    private socketPath: string;
    private pendingCmd: Promise<any>;
    private pendingScan: Promise<WpaCtrl.IScanResult[]>;
    private client?: unix.Socket;
    private clientPath?: string;

    /**
     * constructs WpaCtrl
     * @param {string} ifName interface name eg. wlan0
     * @param {string} [ctrlPath='/run/wpa_supplicant'] - The location of the wpa_supplicant control interface.
     */
    constructor(ifName: string, ctrlPath = '/run/wpa_supplicant') {
        super();
        this.ifName = ifName;
        this.socketPath = path.join(ctrlPath, ifName);
        this.pendingCmd = Promise.resolve();
        this.pendingScan = Promise.resolve([]);
    }

    /**
     * connect to wpa control interface
     * @returns {Promise}
     */
    connect(): Promise<void> {
        if (this.client != null) {
            return Promise.resolve();
        }

        return new Promise<void>((resolve, reject) => {
            this.client = unix.createSocket('unix_dgram');
            this.client.on('message', this._onMessage.bind(this));
            this.client.once('error', reject);
            this.client.once('connect', () => {
                this.clientPath = '/tmp/wpa_ctrl' + Math.random().toString(36).substr(1);
                this.client!.bind(this.clientPath);
            });
            this.client.once('listening', () => {
                this.sendCmd(WPA_CMD.attach);
                this.client!.removeListener('error', reject);
                resolve();
            });
            this.client.connect(this.socketPath);
        }).catch((err) => {
            this.close();
            return Promise.reject(err);
        });
    }

    /**
     * close the wpa control interface
     */
    close() {
        if (this.client != null) {
            this.client.close();
            this.client = undefined;
        }

        try {
            if (this.clientPath != null) {
                unlinkSync(this.clientPath);
                this.clientPath = undefined;
            }
        } catch (err) {
            console.log('Error removing client socket.', err);
        }
    }

    /**
     * message event handler
     * @private
     * @param  {Buffer} msg message recieved from wpa_ctrl
     */
    private _onMessage(buf: Buffer) {
        let msg = buf.toString().replace(/\n$/, '');
        this.emit('raw_msg', msg);
        let match = msg.match(/^<(\d)>(CTRL-REQ)-(.*)/) || msg.match(/^<(\d)>([-\w]+)\s*(.+)?/);
        if (match !== null) {
            let params = { event: match[2], level: +match[1], raw: match[3] };

            this._addParsedEventData(params);
            this.emit(params.event, params);
        } else {
            this.emit('response', msg);
        }
    }

    /**
     * add parsed parameters to the event data object
     * @private
     * @param {object} params
     */
    private _addParsedEventData(params: WpaCtrl.IEventParams) {
        if (!hasParsedEventParams(params) || params.raw == null) {
            return;
        }

        let match: RegExpMatchArray | null;
        switch (params.event) {
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
     * send request to wpa_supplicant control interface
     * @param  {string} msg wpa_supplicant commands
     * @returns {Promise}
     */
    sendCmd(msg: string) {
        this.pendingCmd = this.pendingCmd.then(() => {
            return new Promise((resolve, reject) => {
                if (this.client != null) {
                    this.client.once('error', reject);
                    this.once('response', (resp) => {
                        if (this.client != null) {
                            this.client.removeListener('error', reject);
                        }
                        this._parseResponse(resp, resolve, reject);
                    });
                    this.client.send(new Buffer(msg));
                } else {
                    reject(new Error('Not connected.'));
                }
            });
        });

        return this.pendingCmd;
    }

    /**
     * parse response from wpa_supplicant control interface
     * @private
     * @param  {string} msg wpa_supplicant response
     */
    private _parseResponse(msg: string, resolve: (value?: any) => void, reject: (reason: Error) => void) {
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
            case /^wpa_state=/m.test(msg):
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
    scan(): Promise<WpaCtrl.IScanResult[]> {
        this.pendingScan = this.pendingScan.then(() => {
            return new Promise<WpaCtrl.IScanResult[]>((resolve, reject) => {
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
    scanResults(): Promise<WpaCtrl.IScanResult[]> {
        return this.sendCmd(WPA_CMD.scanResult);
    }

    /**
     * scan results handler
     * @private
     * @param  {string} msg scan results message
     */
    private _parseScanResult(msg: string) {
        function parseFlags(flags: string) {
            const CIPHER = '(?:CCMP-256|GCMP-256|CCMP|GCMP|TKIP|NONE)';
            const KEY_MGMT = '(?:EAP|PSK|None|SAE|FT/EAP|FT/PSK|FT/SAE|EAP-SHA256|PSK-SHA256|EAP-SUITE-B|EAP-SUITE-B-192|OSEN)';
            const PROTO = '(WPA|RSN|WPA2|OSEN)';
            const CRYPTO_FLAG = new RegExp(
                `${PROTO}-(?:(${KEY_MGMT}(?:\\+${KEY_MGMT})*)-(${CIPHER}(?:\\+${CIPHER})*)(-preauth)?|\\?)`);

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

        let lines = msg.split('\n');
        lines.splice(0, 1);
        let scanResults: WpaCtrl.IScanResult[] = [];
        for (let line of lines) {
            if (line.length > 3) {
                let fields = line.split('\t');
                scanResults.push({
                    bssid: fields[0].trim(),
                    freq: +fields[1].trim(),
                    rssi: +fields[2].trim(),
                    flags: parseFlags(fields[3].trim()),
                    ssid: fields[4].trim()
                });
            }
        }
        return scanResults;
    }

    /**
     * list network handler, list all configured networks or devices
     * @private
     * @param  {string} msg network or devices list
     */
    private _parseListNetwork(msg: string) {
        let lines = msg.split('\n');
        lines.splice(0, 1);
        let networkResults: WpaCtrl.INetworkResult[] = [];
        for (let line of lines) {
            if (line.length > 3) {
                let fields = line.split('\t');
                let flagField = (fields[3] || '[]').trim();
                let flags = flagField.substr(1, flagField.length - 2).split('][');
                networkResults.push({
                    networkId: +fields[0].trim(),
                    ssid: fields[1].trim(),
                    bssid: fields[2].trim(),
                    flags
                });
            }
        }
        return networkResults;
    }

    /**
     * add new network
     * @returns {Promise}
     */
    addNetwork(): Promise<number> {
        return this.sendCmd(WPA_CMD.addNetwork);
    }

    /**
     * request to list networks
     * @returns {Promise}
     */
    listNetworks(): Promise<WpaCtrl.INetworkResult[]> {
        return this.sendCmd(WPA_CMD.listNetwork);
    }

    /**
     * request for status
     * @returns {Promise}
     */
    status(): Promise<WpaCtrl.IStatus> {
        return this.sendCmd(WPA_CMD.status);
    }

    /**
     * status handler, parses status messages and emits status event
     * @private
     * @param  {string} msg status message
     */
    private _parseStatus(msg: string) {
        let lines = msg.split('\n');
        let status: WpaCtrl.IStatus = {};
        for (let line of lines) {
            if (line.length > 3) {
                let fields = line.split('=');
                status[fields[0]] = fields[1];
            }
        }
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
    setNetworkVariable(networkId: number, variable: string, value: string): Promise<void> {
        return this.sendCmd(WPA_CMD.setNetwork
            .replace(':id', networkId.toString())
            .replace(':key', variable)
            .replace(':value', value));
    }

    /**
     * set network ssid
     * @param {number} networkId network id recieved from list networks
     * @param {string} ssid ssid of the network
     * @returns {Promise}
     */
    setNetworkSSID(networkId: number, ssid: string): Promise<void> {
        return this.setNetworkVariable(networkId, 'ssid', `"${ssid}"`);
    }

    /**
     * set network pre-shared key
     * @param {number} networkId networkId network id recieved from list networks
     * @param {string} preSharedKey  pre-shared key
     * @param {string} ssid  ssid of the network
     * @returns {Promise}
     */
    setNetworkPreSharedKey(networkId: number, preSharedKey: string, ssid: string): Promise<void> {
        return new Promise<string>((resolve, reject) => {
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
    setNetworkIdentity(networkId: number, identity: string): Promise<void> {
        return this.setNetworkVariable(networkId, 'identity', `"${identity}"`);
    }

    /**
     * set network password
     * @param {number} networkId network id recieved from list networks
     * @param {string} password password string for EAP
     * @returns {Promise}
     */
    setNetworkPassword(networkId: number, password: string): Promise<void> {
        let hash = createHash('md4');
        hash.update(Buffer.from(password, 'utf16le'));
        return this.setNetworkVariable(networkId, 'password', `hash:${hash.digest('hex')}`);
    }

    /**
     * enable configured network
     * @param  {number} networkId networkId network id recieved from list networks
     * @returns {Promise}
     */
    enableNetwork(networkId: number): Promise<void> {
        return this.sendCmd(WPA_CMD.enableNetwork.replace(/:id/, networkId.toString()));
    }

    /**
     * select network to connect
     * @param  {number} networkId networkId network id recieved from list networks
     * @returns {Promise}
     */
    selectNetwork(networkId: number): Promise<void> {
        return this.sendCmd(WPA_CMD.selectNetwork.replace(/:id/, networkId.toString()));
    }

    /**
     * save the current configuration
     * 
     * @returns {Promise}
     */
    saveConfig(): Promise<void> {
        return this.sendCmd(WPA_CMD.saveConfig);
    }

    /**
     * reload the configuration from disk
     * 
     * @returns {Promise}
     */
    reconfigure(): Promise<void> {
        return this.sendCmd(WPA_CMD.reconfigure);
    }

    /**
     * Force reassociation
     * 
     * @returns {Promise}
     */
    reassociate(): Promise<void> {
        return this.sendCmd(WPA_CMD.reassociate);
    }

    /**
     * disconnect from AP
     * @returns {Promise}
     */
    disconnectAP(): Promise<void> {
        return this.sendCmd(WPA_CMD.disconnectAP);
    }

    /**
     * search for peers
     * @returns {Promise}
     */
    peerFind(): Promise<void> {
        return this.sendCmd(WPA_CMD.peerSearch);
    }

    /**
     * stop peer search
     * @returns {Promise}
     */
    peerStopFind(): Promise<void> {
        return this.sendCmd(WPA_CMD.peerStopSearch);
    }

    /**
     * fetch Peer Information
     * @param  {string} peerAddress peer device address
     * @returns {Promise}
     */
    peerInfo(peerAddress: string): Promise<WpaCtrl.IPeerInfo> {
        let cmd = WPA_CMD.peerInfo.replace(':peer_addr', peerAddress);
        return this.sendCmd(cmd);
    }

    /**
     * connect to peer with PBC(Push Button Control) authentication mechanism
     * @param  {string}  peerAddress Mac Address of peer
     * @param  {Boolean} isOwner     Your role, are you group owner? if yes then true else false
     * @returns {Promise}
     */
    peerConnectPBC(peerAddress: string, isOwner: boolean): Promise<void> {
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
    peerConnectPIN(peerAddress: string, pin: string, isOwner: boolean): Promise<void> {
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
    private _parsePeerInfo(msg: string) {
        let lines = msg.split('\n');
        let deviceAddressExp = /\w{2}:\w{2}:\w{2}:\w{2}:\w{2}:\w{2}/;
        let status: WpaCtrl.IStatus = {};
        for (let line of lines) {
            if (line.length > 3) {
                let deviceAddress = deviceAddressExp.exec(line);
                if (!deviceAddress) {
                    let fields = line.split('=');
                    status[fields[0]] = fields[1];
                } else {
                    status.address = deviceAddress[0];
                }
            }
        }
        return status;
    }

    /**
     * list network interfaces on system
     * @returns {Promise}
     */
    listInterfaces(): Promise<WpaCtrl.IInterfaces> {
        return new Promise((resolve, reject) => {
            exec(WPA_CMD.listInterfaces, (err, stdin) => {
                if (err) {
                    reject(err);
                } else {
                    let interfaceInfo: WpaCtrl.IInterfaces = {};
                    let output = stdin.split(/\n/);
                    let currentInterface: WpaCtrl.IInterfaceInfo | undefined;
                    const PATTERNS = {
                        interface: /(^\w{1,20}(-\w{1,20}-\w{1,20})?)/,
                        macAddr: /ether (([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2}))/,
                        ipaddress: /inet (\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/,
                        bcastAddr: /broadcast (\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/
                    };

                    for (let line of output) {
                        let match = line.match(PATTERNS.interface);
                        if (match != null) {
                            currentInterface = interfaceInfo[match[1]] = {};
                        } else if (currentInterface != null) {
                            match = line.match(PATTERNS.macAddr);
                            if (match != null) { currentInterface.hwAddr = match[1]; }

                            match = line.match(PATTERNS.ipaddress);
                            if (match != null) { currentInterface.ipaddress = match[1]; }

                            match = line.match(PATTERNS.bcastAddr);
                            if (match != null) { currentInterface.broadcastAddress = match[1]; }
                        }
                    }

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
    removeVitualInterface(iFaceName: string): Promise<void> {
        let cmd = WPA_CMD.removeVirtIface.replace(':iface', iFaceName);
        return this.sendCmd(cmd);
    }

    /**
     * Flush peer data
     * @returns {Promise}
     */
    flushPeers(): Promise<void> {
        let cmd = WPA_CMD.flushPeers;
        return this.sendCmd(cmd);
    }
}

namespace WpaCtrl {
    export interface IInterfaceInfo {
        hwAddr?: string;
        ipaddress?: string;
        broadcastAddress?: string;
    }

    export interface IInterfaces {
        [iface: string]: IInterfaceInfo | undefined;
    }

    export interface ICryptoFlag {
        proto: string;
        keyMgmt?: string[];
        cipher?: string[];
        preauth: boolean;
    }

    export interface IScanResult {
        bssid: string;
        freq: number;
        rssi: number;
        flags: Array<string | ICryptoFlag>;
        ssid: string;
    }

    export interface INetworkResult {
        networkId: number;
        ssid: string;
        bssid: string;
        flags: string[];
    }

    export interface IStatus {
        [key: string]: string | undefined;
    }

    export type IPeerInfo = IStatus;

    export interface IBaseEventParams {
        event: string;
        level: number;
        raw?: string;
    }

    export interface ICtrlReqEventParams extends IBaseEventParams {
        event: 'CTRL-REQ';
        field: string;
        networkId: number;
        prompt: string;
    }

    export interface IP2PDeviceEventParams extends IBaseEventParams {
        event: 'P2P-DEVICE-FOUND' | 'P2P-DEVICE-LOST';
        deviceAddress?: string;
        deviceName?: string;
    }

    export interface IP2PInterfaceEventParams extends IBaseEventParams {
        event: 'P2P-GROUP-STARTED';
        peerInterface?: string;
    }

    export interface IP2PAddressEventParams extends IBaseEventParams {
        event: 'P2P-INVITATION-RECEIVED';
        peerAddress?: string;
    }

    export type IEventParams = IBaseEventParams | ICtrlReqEventParams | IP2PDeviceEventParams |
        IP2PInterfaceEventParams | IP2PAddressEventParams;
}

function hasParsedEventParams(params: WpaCtrl.IEventParams): params is WpaCtrl.ICtrlReqEventParams |
    WpaCtrl.IP2PDeviceEventParams | WpaCtrl.IP2PInterfaceEventParams | WpaCtrl.IP2PAddressEventParams {
    return ['CTRL-REQ', 'P2P-DEVICE-FOUND', 'P2P-DEVICE-LOST', 'P2P-GROUP-STARTED', 'P2P-INVITATION-RECEIVED']
        .indexOf(params.event) !== -1;
}

export = WpaCtrl;
