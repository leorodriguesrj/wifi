/// <reference types="node" />
import { EventEmitter } from 'events';
/**
 * WpaCtrl to control wpa_supplicant
 *
 * @see {@link http://w1.fi/wpa_supplicant/devel/ctrl_iface_page.html} for full documentation of the commands that can be sent
 * and events that can be emitted.
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
     * @param ifName interface name eg. wlan0
     * @param [ctrlPath='/run/wpa_supplicant'] - The location of the wpa_supplicant control interface.
     */
    constructor(ifName: string, ctrlPath?: string);
    /**
     * connect to wpa control interface
     */
    connect(): Promise<void>;
    /**
     * close the wpa control interface
     */
    close(): void;
    /**
     * message event handler
     * @param msg message recieved from wpa_ctrl
     */
    private _onMessage(buf);
    /**
     * add parsed parameters to the event data object
     * @param event
     * @param params
     */
    private _addParsedEventData(params);
    /**
     * send request to wpa_supplicant control interface
     * @param msg wpa_supplicant commands
     */
    sendCmd(msg: string): Promise<any>;
    /**
     * parse response from wpa_supplicant control interface
     * @param msg wpa_supplicant response
     */
    private _parseResponse(msg, resolve, reject);
    /**
     * scan for wifi AP
     */
    scan(): Promise<WpaCtrl.IScanResult[]>;
    /**
     * request for wifi scan results
     */
    scanResults(): Promise<WpaCtrl.IScanResult[]>;
    /**
     * scan results handler
     * @param msg scan results message
     */
    private _parseScanResult(msg);
    /**
     * list network handler, list all configured networks or devices
     * @param msg network or devices list
     */
    private _parseListNetwork(msg);
    /**
     * add new network
     */
    addNetwork(): Promise<number>;
    /**
     * request to list networks
     */
    listNetworks(): Promise<WpaCtrl.INetworkResult[]>;
    /**
     * request for status
     */
    status(): Promise<WpaCtrl.IStatus>;
    /**
     * status handler, parses status messages and emits status event
     * @param msg status message
     */
    private _parseStatus(msg);
    /**
     * set network variable
     *
     * @param networkId network id recieved from list networks
     * @param variable variable to set
     * @param value value for the variable
     */
    setNetworkVariable(networkId: number, variable: string, value: string): Promise<void>;
    /**
     * set network ssid
     * @param networkId network id recieved from list networks
     * @param ssid ssid of the network
     */
    setNetworkSSID(networkId: number, ssid: string): Promise<void>;
    /**
     * set network pre-shared key
     * @param networkId networkId network id recieved from list networks
     * @param preSharedKey  pre-shared key
     * @param ssid  ssid of the network
     */
    setNetworkPreSharedKey(networkId: number, preSharedKey: string, ssid: string): Promise<void>;
    /**
     * set network identity
     * @param networkId network id recieved from list networks
     * @param identity identity string for EAP
     */
    setNetworkIdentity(networkId: number, identity: string): Promise<void>;
    /**
     * set network password
     * @param networkId network id recieved from list networks
     * @param password password string for EAP
     */
    setNetworkPassword(networkId: number, password: string): Promise<void>;
    /**
     * enable configured network
     * @param networkId networkId network id recieved from list networks
     */
    enableNetwork(networkId: number): Promise<void>;
    /**
     * select network to connect
     * @param networkId networkId network id recieved from list networks
     */
    selectNetwork(networkId: number): Promise<void>;
    /**
     * save the current configuration
     */
    saveConfig(): Promise<void>;
    /**
     * reload the configuration from disk
     */
    reconfigure(): Promise<void>;
    /**
     * Force reassociation
     */
    reassociate(): Promise<void>;
    /**
     * disconnect from AP
     */
    disconnectAP(): Promise<void>;
    /**
     * search for peers
     */
    peerFind(): Promise<void>;
    /**
     * stop peer search
     */
    peerStopFind(): Promise<void>;
    /**
     * fetch Peer Information
     * @param peerAddress peer device address
     */
    peerInfo(peerAddress: string): Promise<WpaCtrl.IPeerInfo>;
    /**
     * connect to peer with PBC(Push Button Control) authentication mechanism
     * @param  peerAddress Mac Address of peer
     * @param isOwner     Your role, are you group owner? if yes then true else false
     */
    peerConnectPBC(peerAddress: string, isOwner: boolean): Promise<void>;
    /**
     * connect to peer with PIN(password) authentication mechanism
     * @param  peerAddress Mac Address of peer
     * @param  pin         password for authentication
     * @param isOwner     Your role, are you group owner? if yes then true else false
     */
    peerConnectPIN(peerAddress: string, pin: string, isOwner: boolean): Promise<void>;
    /**
     * peer info event handler
     * @param msg event message
     */
    private _parsePeerInfo(msg);
    /**
     * list network interfaces on system
     */
    listInterfaces(): Promise<WpaCtrl.IInterfaces>;
    /**
     * Remove virtual interface eg: p2p-p2p0-1
     * @param   iFaceName interface name
     * @param callback  callback function
     */
    removeVitualInterface(iFaceName: string): Promise<void>;
    /**
     * Flush peer data
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
        event: string;
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
