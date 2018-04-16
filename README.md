<a name="WpaCtrl"></a>

## WpaCtrl
WpaCtrl to control wpa_supplicant

<h3>Install:</h3>

`npm install wpa-ctrl --save`

<h3>Note:</h3>

This only works on linux, tested on Debian stretch. You need to have `wpa_supplicant` installed and run as a user in the
`netdev` group.

For more examples, see the test directory for p2p and wifi connection samples. This is a very basic library, it is nessary to
write another wrapper over this.

**Kind**: global class  
**Emits**: <code>WpaCtrl#event:raw_msg</code>, <code>WpaCtrl#event:response</code>, <code>WpaCtrl#event:CTRL-REQ</code>, <code>WpaCtrl#event:P2P-DEVICE-FOUND</code>, <code>WpaCtrl#event:P2P-DEVICE-LOST</code>, <code>WpaCtrl#event:P2P-GROUP-STARTED</code>, <code>WpaCtrl#event:P2P-INVITATION-RECEIVED</code>, <code>WpaCtrl#event:CTRL-EVENT-CONNECTED</code>, <code>WpaCtrl#event:CTRL-EVENT-DISCONNECTED</code>  
**See**: [http://w1.fi/wpa_supplicant/devel/ctrl_iface_page.html](http://w1.fi/wpa_supplicant/devel/ctrl_iface_page.html) for full documentation of the commands that can be sent
and events that can be emitted.  

* [WpaCtrl](#WpaCtrl)
    * [new WpaCtrl(ifName, [ctrlPath])](#new_WpaCtrl_new)
    * [.connect()](#WpaCtrl+connect) ⇒ <code>Promise</code>
    * [.close()](#WpaCtrl+close)
    * [.sendCmd(msg)](#WpaCtrl+sendCmd) ⇒ <code>Promise</code>
    * [.scan()](#WpaCtrl+scan) ⇒ <code>Promise</code>
    * [.scanResults()](#WpaCtrl+scanResults) ⇒ <code>Promise</code>
    * [.addNetwork()](#WpaCtrl+addNetwork) ⇒ <code>Promise</code>
    * [.listNetworks()](#WpaCtrl+listNetworks) ⇒ <code>Promise</code>
    * [.status()](#WpaCtrl+status) ⇒ <code>Promise</code>
    * [.setNetworkVariable(networkId, variable, value)](#WpaCtrl+setNetworkVariable) ⇒ <code>Promise</code>
    * [.setNetworkSSID(networkId, ssid)](#WpaCtrl+setNetworkSSID) ⇒ <code>Promise</code>
    * [.setNetworkPreSharedKey(networkId, preSharedKey, ssid)](#WpaCtrl+setNetworkPreSharedKey) ⇒ <code>Promise</code>
    * [.setNetworkIdentity(networkId, identity)](#WpaCtrl+setNetworkIdentity) ⇒ <code>Promise</code>
    * [.setNetworkPassword(networkId, password)](#WpaCtrl+setNetworkPassword) ⇒ <code>Promise</code>
    * [.enableNetwork(networkId)](#WpaCtrl+enableNetwork) ⇒ <code>Promise</code>
    * [.selectNetwork(networkId)](#WpaCtrl+selectNetwork) ⇒ <code>Promise</code>
    * [.saveConfig()](#WpaCtrl+saveConfig) ⇒ <code>Promise</code>
    * [.reconfigure()](#WpaCtrl+reconfigure) ⇒ <code>Promise</code>
    * [.reassociate()](#WpaCtrl+reassociate) ⇒ <code>Promise</code>
    * [.disconnectAP()](#WpaCtrl+disconnectAP) ⇒ <code>Promise</code>
    * [.peerFind()](#WpaCtrl+peerFind) ⇒ <code>Promise</code>
    * [.peerStopFind()](#WpaCtrl+peerStopFind) ⇒ <code>Promise</code>
    * [.peerInfo(peerAddress)](#WpaCtrl+peerInfo) ⇒ <code>Promise</code>
    * [.peerConnectPBC(peerAddress, isOwner)](#WpaCtrl+peerConnectPBC) ⇒ <code>Promise</code>
    * [.peerConnectPIN(peerAddress, pin, isOwner)](#WpaCtrl+peerConnectPIN) ⇒ <code>Promise</code>
    * [.listInterfaces()](#WpaCtrl+listInterfaces) ⇒ <code>Promise</code>
    * [.removeVitualInterface(iFaceName, callback)](#WpaCtrl+removeVitualInterface) ⇒ <code>Promise</code>
    * [.flushPeers()](#WpaCtrl+flushPeers) ⇒ <code>Promise</code>

<a name="new_WpaCtrl_new"></a>

### new WpaCtrl(ifName, [ctrlPath])
constructs WpaCtrl


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| ifName | <code>string</code> |  | interface name eg. wlan0 |
| [ctrlPath] | <code>string</code> | <code>&quot;&#x27;/run/wpa_supplicant&#x27;&quot;</code> | The location of the wpa_supplicant control interface. |

**Example** *(Scan for SSIDs and connect to an wireless network.)*  
```js
'use strict';

const WpaCtrl = require('wap-ctrl');
let wpa = new WpaCtrl('wlan0');

wpa.on('raw_msg', function(msg) {
    console.log(msg);
});

wpa.connect().then(function () {
    console.log('ready');

    return wpa.listNetworks();
}).then(function (networks) {
    console.log(networks);

    return wpa.scan();
}).then(function (accessPoints) {
    console.log(accessPoints);

    wpa.addNetwork();
    wpa.setNetworkSSID(0, 'ssid');
    wpa.setNetworkPreSharedKey(0, 'password');
    wpa.enableNetwork(0);
    return wpa.selectNetwork(0);
}).then(function () {
    wpa.close();
}).catch(function (err) {
    console.log(err);
});
```
<a name="WpaCtrl+connect"></a>

### wpaCtrl.connect() ⇒ <code>Promise</code>
connect to wpa control interface

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  
<a name="WpaCtrl+close"></a>

### wpaCtrl.close()
close the wpa control interface

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  
<a name="WpaCtrl+sendCmd"></a>

### wpaCtrl.sendCmd(msg) ⇒ <code>Promise</code>
send request to wpa_supplicant control interface

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>string</code> | wpa_supplicant commands |

<a name="WpaCtrl+scan"></a>

### wpaCtrl.scan() ⇒ <code>Promise</code>
scan for wifi AP

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  
<a name="WpaCtrl+scanResults"></a>

### wpaCtrl.scanResults() ⇒ <code>Promise</code>
request for wifi scan results

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  
<a name="WpaCtrl+addNetwork"></a>

### wpaCtrl.addNetwork() ⇒ <code>Promise</code>
add new network

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  
<a name="WpaCtrl+listNetworks"></a>

### wpaCtrl.listNetworks() ⇒ <code>Promise</code>
request to list networks

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  
<a name="WpaCtrl+status"></a>

### wpaCtrl.status() ⇒ <code>Promise</code>
request for status

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  
<a name="WpaCtrl+setNetworkVariable"></a>

### wpaCtrl.setNetworkVariable(networkId, variable, value) ⇒ <code>Promise</code>
set network variable

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  

| Param | Type | Description |
| --- | --- | --- |
| networkId | <code>number</code> | network id recieved from list networks |
| variable | <code>string</code> | variable to set |
| value | <code>string</code> | value for the variable |

<a name="WpaCtrl+setNetworkSSID"></a>

### wpaCtrl.setNetworkSSID(networkId, ssid) ⇒ <code>Promise</code>
set network ssid

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  

| Param | Type | Description |
| --- | --- | --- |
| networkId | <code>number</code> | network id recieved from list networks |
| ssid | <code>string</code> | ssid of the network |

<a name="WpaCtrl+setNetworkPreSharedKey"></a>

### wpaCtrl.setNetworkPreSharedKey(networkId, preSharedKey, ssid) ⇒ <code>Promise</code>
set network pre-shared key

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  

| Param | Type | Description |
| --- | --- | --- |
| networkId | <code>number</code> | networkId network id recieved from list networks |
| preSharedKey | <code>string</code> | pre-shared key |
| ssid | <code>string</code> | ssid of the network |

<a name="WpaCtrl+setNetworkIdentity"></a>

### wpaCtrl.setNetworkIdentity(networkId, identity) ⇒ <code>Promise</code>
set network identity

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  

| Param | Type | Description |
| --- | --- | --- |
| networkId | <code>number</code> | network id recieved from list networks |
| identity | <code>string</code> | identity string for EAP |

<a name="WpaCtrl+setNetworkPassword"></a>

### wpaCtrl.setNetworkPassword(networkId, password) ⇒ <code>Promise</code>
set network password

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  

| Param | Type | Description |
| --- | --- | --- |
| networkId | <code>number</code> | network id recieved from list networks |
| password | <code>string</code> | password string for EAP |

<a name="WpaCtrl+enableNetwork"></a>

### wpaCtrl.enableNetwork(networkId) ⇒ <code>Promise</code>
enable configured network

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  

| Param | Type | Description |
| --- | --- | --- |
| networkId | <code>number</code> | networkId network id recieved from list networks |

<a name="WpaCtrl+selectNetwork"></a>

### wpaCtrl.selectNetwork(networkId) ⇒ <code>Promise</code>
select network to connect

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  

| Param | Type | Description |
| --- | --- | --- |
| networkId | <code>number</code> | networkId network id recieved from list networks |

<a name="WpaCtrl+saveConfig"></a>

### wpaCtrl.saveConfig() ⇒ <code>Promise</code>
save the current configuration

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  
<a name="WpaCtrl+reconfigure"></a>

### wpaCtrl.reconfigure() ⇒ <code>Promise</code>
reload the configuration from disk

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  
<a name="WpaCtrl+reassociate"></a>

### wpaCtrl.reassociate() ⇒ <code>Promise</code>
Force reassociation

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  
<a name="WpaCtrl+disconnectAP"></a>

### wpaCtrl.disconnectAP() ⇒ <code>Promise</code>
disconnect from AP

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  
<a name="WpaCtrl+peerFind"></a>

### wpaCtrl.peerFind() ⇒ <code>Promise</code>
search for peers

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  
<a name="WpaCtrl+peerStopFind"></a>

### wpaCtrl.peerStopFind() ⇒ <code>Promise</code>
stop peer search

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  
<a name="WpaCtrl+peerInfo"></a>

### wpaCtrl.peerInfo(peerAddress) ⇒ <code>Promise</code>
fetch Peer Information

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  

| Param | Type | Description |
| --- | --- | --- |
| peerAddress | <code>string</code> | peer device address |

<a name="WpaCtrl+peerConnectPBC"></a>

### wpaCtrl.peerConnectPBC(peerAddress, isOwner) ⇒ <code>Promise</code>
connect to peer with PBC(Push Button Control) authentication mechanism

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  

| Param | Type | Description |
| --- | --- | --- |
| peerAddress | <code>string</code> | Mac Address of peer |
| isOwner | <code>Boolean</code> | Your role, are you group owner? if yes then true else false |

<a name="WpaCtrl+peerConnectPIN"></a>

### wpaCtrl.peerConnectPIN(peerAddress, pin, isOwner) ⇒ <code>Promise</code>
connect to peer with PIN(password) authentication mechanism

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  

| Param | Type | Description |
| --- | --- | --- |
| peerAddress | <code>string</code> | Mac Address of peer |
| pin | <code>string</code> | password for authentication |
| isOwner | <code>Boolean</code> | Your role, are you group owner? if yes then true else false |

<a name="WpaCtrl+listInterfaces"></a>

### wpaCtrl.listInterfaces() ⇒ <code>Promise</code>
list network interfaces on system

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  
<a name="WpaCtrl+removeVitualInterface"></a>

### wpaCtrl.removeVitualInterface(iFaceName, callback) ⇒ <code>Promise</code>
Remove virtual interface eg: p2p-p2p0-1

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  

| Param | Type | Description |
| --- | --- | --- |
| iFaceName | <code>string</code> | interface name |
| callback | <code>function</code> | callback function |

<a name="WpaCtrl+flushPeers"></a>

### wpaCtrl.flushPeers() ⇒ <code>Promise</code>
Flush peer data

**Kind**: instance method of <code>[WpaCtrl](#WpaCtrl)</code>  
