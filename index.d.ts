import { EventEmitter } from 'events';

/**
 * WpaCli to control wpa_supplicant
 * 
 * @emits WpaCli#scanning
 * @emits WpaCli#ap_connected
 * @emits WpaCli#ap_disconnected
 * @emits WpaCli#peer_found
 * @emits WpaCli#peer_invitation_received
 * @emits WpaCli#peer_disconnected
 * @emits WpaCli#raw_msg
 */
declare class WpaCli extends EventEmitter {
    constructor(ifName: string, ctrlPath = '/run/wpa_supplicant', clientPath?: string);

    connect(): Promise;
    close(): void;
    sendCmd(msg: string): Promise;
    scan(): Promise<WpaCli.IScanResult[]>;
    scanResults(): Promise<WpaCli.IScanResult[]>;
    addNetwork(): Promise<number>;
    listNetworks(): Promise<WpaCli.INetworkResult[]>;
    status(): Promise<WpaCli.IStatus>;
    setNetworkVariable(networkId: number, variable: string, value: string): Promise;
    setNetworkSSID(networkId: number, ssid: string): Promise;
    setNetworkPreSharedKey(networkId: number, preSharedKey: string, ssid: string): Promise;
    setNetworkIdentity(networkId: number, identity: string): Promise;
    setNetworkPassword(networkId: number, password: string): Promise;
    enableNetwork(networkId: number): Promise;
    selectNetwork(networkId: number): Promise;
    saveConfig(): Promise;
    reconfigure(): Promise;
    reassociate(): Promise;
    // startDhClient(): void;
    // stopDhClient(): void;
    disconnectAP(): Promise;
    peerFind(): Promise;
    peerStopFind(): Promise;
    peerInfo(peerAddress: string): Promise<WpaCli.IPeerInfo>;
    peerConnectPBC(peerAddress: string, isOwner: boolean): Promise;
    peerConnectPIN(peerAddress: string, pin: string, isOwner: boolean): Promise;
    listInterfaces(): Promise<WpaCli.IInterfaceInfo>;
    removeVitualInterface(iFaceName: string): Promise;
    flushPeers(): Promise;
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

    export interface IPeerAddress {
        deviceAddress: string;
        deviceName?: string;
    }
}

export = WpaCli;
