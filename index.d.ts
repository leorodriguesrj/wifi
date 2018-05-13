/// <reference types="node" />
import { EventEmitter } from 'events';
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
declare class WpaCtrl extends EventEmitter {
    private ifName;
    private socketPath;
    private pendingCmd;
    private pendingScan;
    private client?;
    private clientPath?;
    /**
     * constructs WpaCtrl
     * @param {string} ifName interface name eg. wlan0
     * @param {string} [ctrlPath='/run/wpa_supplicant'] - The location of the wpa_supplicant control interface.
     */
    constructor(ifName: string, ctrlPath?: string);
    /**
     * connect to wpa control interface
     * @returns {Promise}
     */
    connect(): Promise<void>;
    /**
     * close the wpa control interface
     */
    close(): void;
    /**
     * message event handler
     * @private
     * @param  {Buffer} msg message recieved from wpa_ctrl
     */
    private _onMessage(buf);
    /**
     * add parsed parameters to the event data object
     * @private
     * @param {string} event
     * @param {object} params
     */
    private _addParsedEventData(event, params);
    /**
     * send request to wpa_supplicant control interface
     * @param  {string} msg wpa_supplicant commands
     * @returns {Promise}
     */
    sendCmd(msg: string): Promise<any>;
    /**
     * parse response from wpa_supplicant control interface
     * @private
     * @param  {string} msg wpa_supplicant response
     */
    private _parseResponse(msg, resolve, reject);
    /**
     * scan for wifi AP
     * @returns {Promise}
     */
    scan(): Promise<WpaCtrl.IScanResult[]>;
    /**
     * request for wifi scan results
     * @returns {Promise}
     */
    scanResults(): Promise<WpaCtrl.IScanResult[]>;
    /**
     * scan results handler
     * @private
     * @param  {string} msg scan results message
     */
    private _parseScanResult(msg);
    /**
     * list network handler, list all configured networks or devices
     * @private
     * @param  {string} msg network or devices list
     */
    private _parseListNetwork(msg);
    /**
     * add new network
     * @returns {Promise}
     */
    addNetwork(): Promise<number>;
    /**
     * request to list networks
     * @returns {Promise}
     */
    listNetworks(): Promise<WpaCtrl.INetworkResult[]>;
    /**
     * request for status
     * @returns {Promise}
     */
    status(): Promise<WpaCtrl.IStatus>;
    /**
     * status handler, parses status messages and emits status event
     * @private
     * @param  {string} msg status message
     */
    private _parseStatus(msg);
    /**
     * set network variable
     *
     * @param {number} networkId network id recieved from list networks
     * @param {string} variable variable to set
     * @param {string} value value for the variable
     * @returns {Promise}
     */
    setNetworkVariable(networkId: number, variable: string, value: string): Promise<void>;
    /**
     * set network ssid
     * @param {number} networkId network id recieved from list networks
     * @param {string} ssid ssid of the network
     * @returns {Promise}
     */
    setNetworkSSID(networkId: number, ssid: string): Promise<void>;
    /**
     * set network pre-shared key
     * @param {number} networkId networkId network id recieved from list networks
     * @param {string} preSharedKey  pre-shared key
     * @param {string} ssid  ssid of the network
     * @returns {Promise}
     */
    setNetworkPreSharedKey(networkId: number, preSharedKey: string, ssid: string): Promise<void>;
    /**
     * set network identity
     * @param {number} networkId network id recieved from list networks
     * @param {string} identity identity string for EAP
     * @returns {Promise}
     */
    setNetworkIdentity(networkId: number, identity: string): Promise<void>;
    /**
     * set network password
     * @param {number} networkId network id recieved from list networks
     * @param {string} password password string for EAP
     * @returns {Promise}
     */
    setNetworkPassword(networkId: number, password: string): Promise<void>;
    /**
     * enable configured network
     * @param  {number} networkId networkId network id recieved from list networks
     * @returns {Promise}
     */
    enableNetwork(networkId: number): Promise<void>;
    /**
     * select network to connect
     * @param  {number} networkId networkId network id recieved from list networks
     * @returns {Promise}
     */
    selectNetwork(networkId: number): Promise<void>;
    /**
     * save the current configuration
     *
     * @returns {Promise}
     */
    saveConfig(): Promise<void>;
    /**
     * reload the configuration from disk
     *
     * @returns {Promise}
     */
    reconfigure(): Promise<void>;
    /**
     * Force reassociation
     *
     * @returns {Promise}
     */
    reassociate(): Promise<void>;
    /**
     * disconnect from AP
     * @returns {Promise}
     */
    disconnectAP(): Promise<void>;
    /**
     * search for peers
     * @returns {Promise}
     */
    peerFind(): Promise<void>;
    /**
     * stop peer search
     * @returns {Promise}
     */
    peerStopFind(): Promise<void>;
    /**
     * fetch Peer Information
     * @param  {string} peerAddress peer device address
     * @returns {Promise}
     */
    peerInfo(peerAddress: string): Promise<WpaCtrl.IPeerInfo>;
    /**
     * connect to peer with PBC(Push Button Control) authentication mechanism
     * @param  {string}  peerAddress Mac Address of peer
     * @param  {Boolean} isOwner     Your role, are you group owner? if yes then true else false
     * @returns {Promise}
     */
    peerConnectPBC(peerAddress: string, isOwner: boolean): Promise<void>;
    /**
     * connect to peer with PIN(password) authentication mechanism
     * @param  {string}  peerAddress Mac Address of peer
     * @param  {string}  pin         password for authentication
     * @param  {Boolean} isOwner     Your role, are you group owner? if yes then true else false
     * @returns {Promise}
     */
    peerConnectPIN(peerAddress: string, pin: string, isOwner: boolean): Promise<void>;
    /**
     * peer info event handler
     * @private
     * @param  {string} msg event message
     */
    private _parsePeerInfo(msg);
    /**
     * list network interfaces on system
     * @returns {Promise}
     */
    listInterfaces(): Promise<WpaCtrl.IInterfaces>;
    /**
     * Remove virtual interface eg: p2p-p2p0-1
     * @param  {string}   iFaceName interface name
     * @param  {Function} callback  callback function
     * @returns {Promise}
     */
    removeVitualInterface(iFaceName: string): Promise<void>;
    /**
     * Flush peer data
     * @returns {Promise}
     */
    flushPeers(): Promise<void>;
}
declare namespace WpaCtrl {
    interface IInterfaceInfo {
        hwAddr?: string;
        ipaddress?: string;
        broadcastAddress?: string;
    }
    interface IInterfaces {
        [iface: string]: IInterfaceInfo | undefined;
    }
    interface ICryptoFlag {
        proto: string;
        keyMgmt?: string[];
        cipher?: string[];
        preauth: boolean;
    }
    interface IScanResult {
        bssid: string;
        freq: number;
        rssi: number;
        flags: Array<string | ICryptoFlag>;
        ssid: string;
    }
    interface INetworkResult {
        networkId: number;
        ssid: string;
        bssid: string;
        flags: string[];
    }
    interface IStatus {
        [key: string]: string | undefined;
    }
    type IPeerInfo = IStatus;
    interface IBaseEventParams {
        level: number;
        raw?: string;
    }
    interface ICtrlReqEventParams extends IBaseEventParams {
        event: 'CTRL-REQ';
        field: string;
        networkId: number;
        prompt: string;
    }
    interface IP2PDeviceEventParams extends IBaseEventParams {
        event: 'P2P-DEVICE-FOUND' | 'P2P-DEVICE-LOST';
        deviceAddress?: string;
        deviceName?: string;
    }
    interface IP2PInterfaceEventParams extends IBaseEventParams {
        event: 'P2P-GROUP-STARTED';
        peerInterface?: string;
    }
    interface IP2PAddressEventParams extends IBaseEventParams {
        event: 'P2P-INVITATION-RECEIVED';
        peerAddress?: string;
    }
    type IEventParams = IBaseEventParams | ICtrlReqEventParams | IP2PDeviceEventParams | IP2PInterfaceEventParams | IP2PAddressEventParams;
}
export = WpaCtrl;
