import { EventEmitter } from 'events';

/**
 * WpaCli to control wpa_supplicant
 * 
 * @emits WpaCli#ready
 * @emits WpaCli#scanning
 * @emits WpaCli#scan_results
 * @emits WpaCli#list_network
 * @emits WpaCli#status
 * @emits WpaCli#ap_connected
 * @emits WpaCli#ap_disconnected
 * @emits WpaCli#peer_found
 * @emits WpaCli#peer_info
 * @emits WpaCli#peer_invitation_received
 * @emits WpaCli#peer_disconnected
 * @emits WpaCli#raw_msg
 */
declare class WpaCli extends EventEmitter {
    constructor(ifName: string);

    connect(): void;
    sendCmd(msg: string): void;
    scan(): void;
    scanResults(): void;
    addNetwork(): void;
    listNetworks(): void;
    status(): void;
    setSSID(networkId: string, ssid: string): void;
    setPassword(networkId: string, password: string): void;
    enableNetwork(networkId: string): void;
    selectNetwork(networkId: string): void;
    startDhClient(): void;
    stopDhClient(): void;
    disconnectAP(): void;
    peerFind(): void;
    peerList(): void;
    peerStopFind(): void;
    peerInfo(peerAddress: string): void;
    peerConnectPBC(peerAddress: string, isOwner: boolean): void;
    peerConnectPIN(peerAddress: string, pin: string, isOwner: boolean): void;
    listInterfaces(callback: (interfaceInfo: WpaCli.IInterfaceInfo) => any): void;
    removeVitualInterface(iFaceName: string, callback: () => any): void;
    flushPeers(): void;
}

declare namespace WpaCli {
    export interface IInterfaceInfo {
        [interface: string]: {
            hwAddr?: string,
            ipaddress?: string,
            broadcastAddress?: string
        }
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
        flags: (string | ICryptoFlag)[];
        ssid: string;
    }
}

export = WpaCli;
