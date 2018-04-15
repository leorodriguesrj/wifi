<a name="WpaCli"></a>

## WpaCli
WpaCli to control wpa_supplicant

**Kind**: global class  
**Emits**: <code>WpaCli#event:raw_msg</code>, <code>WpaCli#event:response</code>, <code>WpaCli#event:CTRL-REQ</code>, <code>WpaCli#event:P2P-DEVICE-FOUND</code>, <code>WpaCli#event:P2P-DEVICE-LOST</code>, <code>WpaCli#event:P2P-GROUP-STARTED</code>, <code>WpaCli#event:P2P-INVITATION-RECEIVED</code>, <code>WpaCli#event:CTRL-EVENT-CONNECTED</code>, <code>WpaCli#event:CTRL-EVENT-DISCONNECTED</code>  

* [WpaCli](#WpaCli)
    * [new WpaCli(ifName, [ctrlPath])](#new_WpaCli_new)
    * [.connect()](#WpaCli+connect) ⇒ <code>Promise</code>
    * [.close()](#WpaCli+close)
    * [.sendCmd(msg)](#WpaCli+sendCmd) ⇒ <code>Promise</code>
    * [.scan()](#WpaCli+scan) ⇒ <code>Promise</code>
    * [.scanResults()](#WpaCli+scanResults) ⇒ <code>Promise</code>
    * [.addNetwork()](#WpaCli+addNetwork) ⇒ <code>Promise</code>
    * [.listNetworks()](#WpaCli+listNetworks) ⇒ <code>Promise</code>
    * [.status()](#WpaCli+status) ⇒ <code>Promise</code>
    * [.setNetworkVariable(networkId, variable, value)](#WpaCli+setNetworkVariable) ⇒ <code>Promise</code>
    * [.setNetworkSSID(networkId, ssid)](#WpaCli+setNetworkSSID) ⇒ <code>Promise</code>
    * [.setNetworkPreSharedKey(networkId, preSharedKey, ssid)](#WpaCli+setNetworkPreSharedKey) ⇒ <code>Promise</code>
    * [.setNetworkIdentity(networkId, identity)](#WpaCli+setNetworkIdentity) ⇒ <code>Promise</code>
    * [.setNetworkPassword(networkId, password)](#WpaCli+setNetworkPassword) ⇒ <code>Promise</code>
    * [.enableNetwork(networkId)](#WpaCli+enableNetwork) ⇒ <code>Promise</code>
    * [.selectNetwork(networkId)](#WpaCli+selectNetwork) ⇒ <code>Promise</code>
    * [.saveConfig()](#WpaCli+saveConfig) ⇒ <code>Promise</code>
    * [.reconfigure()](#WpaCli+reconfigure) ⇒ <code>Promise</code>
    * [.reassociate()](#WpaCli+reassociate) ⇒ <code>Promise</code>
    * [.disconnectAP()](#WpaCli+disconnectAP) ⇒ <code>Promise</code>
    * [.peerFind()](#WpaCli+peerFind) ⇒ <code>Promise</code>
    * [.peerStopFind()](#WpaCli+peerStopFind) ⇒ <code>Promise</code>
    * [.peerInfo(peerAddress)](#WpaCli+peerInfo) ⇒ <code>Promise</code>
    * [.peerConnectPBC(peerAddress, isOwner)](#WpaCli+peerConnectPBC) ⇒ <code>Promise</code>
    * [.peerConnectPIN(peerAddress, pin, isOwner)](#WpaCli+peerConnectPIN) ⇒ <code>Promise</code>
    * [.listInterfaces()](#WpaCli+listInterfaces) ⇒ <code>Promise</code>
    * [.removeVitualInterface(iFaceName, callback)](#WpaCli+removeVitualInterface) ⇒ <code>Promise</code>
    * [.flushPeers()](#WpaCli+flushPeers) ⇒ <code>Promise</code>

<a name="new_WpaCli_new"></a>

### new WpaCli(ifName, [ctrlPath])
constructs WpaCli


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| ifName | <code>string</code> |  | interface name eg. wlan0 |
| [ctrlPath] | <code>string</code> | <code>&quot;&#x27;/run/wpa_supplicant&#x27;&quot;</code> | The location of the wpa_supplicant control interface. |

<a name="WpaCli+connect"></a>

### wpaCli.connect() ⇒ <code>Promise</code>
connect to wpa control interface

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  
<a name="WpaCli+close"></a>

### wpaCli.close()
close the wpa control interface

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  
<a name="WpaCli+sendCmd"></a>

### wpaCli.sendCmd(msg) ⇒ <code>Promise</code>
send request to wpa_cli

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>string</code> | wpa_cli commands |

<a name="WpaCli+scan"></a>

### wpaCli.scan() ⇒ <code>Promise</code>
scan for wifi AP

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  
<a name="WpaCli+scanResults"></a>

### wpaCli.scanResults() ⇒ <code>Promise</code>
request for wifi scan results

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  
<a name="WpaCli+addNetwork"></a>

### wpaCli.addNetwork() ⇒ <code>Promise</code>
add new network

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  
<a name="WpaCli+listNetworks"></a>

### wpaCli.listNetworks() ⇒ <code>Promise</code>
request to list networks

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  
<a name="WpaCli+status"></a>

### wpaCli.status() ⇒ <code>Promise</code>
request for status

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  
<a name="WpaCli+setNetworkVariable"></a>

### wpaCli.setNetworkVariable(networkId, variable, value) ⇒ <code>Promise</code>
set network variable

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  

| Param | Type | Description |
| --- | --- | --- |
| networkId | <code>number</code> | network id recieved from list networks |
| variable | <code>string</code> | variable to set |
| value | <code>string</code> | value for the variable |

<a name="WpaCli+setNetworkSSID"></a>

### wpaCli.setNetworkSSID(networkId, ssid) ⇒ <code>Promise</code>
set network ssid

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  

| Param | Type | Description |
| --- | --- | --- |
| networkId | <code>number</code> | network id recieved from list networks |
| ssid | <code>string</code> | ssid of the network |

<a name="WpaCli+setNetworkPreSharedKey"></a>

### wpaCli.setNetworkPreSharedKey(networkId, preSharedKey, ssid) ⇒ <code>Promise</code>
set network pre-shared key

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  

| Param | Type | Description |
| --- | --- | --- |
| networkId | <code>number</code> | networkId network id recieved from list networks |
| preSharedKey | <code>string</code> | pre-shared key |
| ssid | <code>string</code> | ssid of the network |

<a name="WpaCli+setNetworkIdentity"></a>

### wpaCli.setNetworkIdentity(networkId, identity) ⇒ <code>Promise</code>
set network identity

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  

| Param | Type | Description |
| --- | --- | --- |
| networkId | <code>number</code> | network id recieved from list networks |
| identity | <code>string</code> | identity string for EAP |

<a name="WpaCli+setNetworkPassword"></a>

### wpaCli.setNetworkPassword(networkId, password) ⇒ <code>Promise</code>
set network password

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  

| Param | Type | Description |
| --- | --- | --- |
| networkId | <code>number</code> | network id recieved from list networks |
| password | <code>string</code> | password string for EAP |

<a name="WpaCli+enableNetwork"></a>

### wpaCli.enableNetwork(networkId) ⇒ <code>Promise</code>
enable configured network

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  

| Param | Type | Description |
| --- | --- | --- |
| networkId | <code>number</code> | networkId network id recieved from list networks |

<a name="WpaCli+selectNetwork"></a>

### wpaCli.selectNetwork(networkId) ⇒ <code>Promise</code>
select network to connect

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  

| Param | Type | Description |
| --- | --- | --- |
| networkId | <code>number</code> | networkId network id recieved from list networks |

<a name="WpaCli+saveConfig"></a>

### wpaCli.saveConfig() ⇒ <code>Promise</code>
save the current configuration

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  
<a name="WpaCli+reconfigure"></a>

### wpaCli.reconfigure() ⇒ <code>Promise</code>
reload the configuration from disk

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  
<a name="WpaCli+reassociate"></a>

### wpaCli.reassociate() ⇒ <code>Promise</code>
Force reassociation

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  
<a name="WpaCli+disconnectAP"></a>

### wpaCli.disconnectAP() ⇒ <code>Promise</code>
disconnect from AP

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  
<a name="WpaCli+peerFind"></a>

### wpaCli.peerFind() ⇒ <code>Promise</code>
search for peers

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  
<a name="WpaCli+peerStopFind"></a>

### wpaCli.peerStopFind() ⇒ <code>Promise</code>
stop peer search

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  
<a name="WpaCli+peerInfo"></a>

### wpaCli.peerInfo(peerAddress) ⇒ <code>Promise</code>
fetch Peer Information

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  

| Param | Type | Description |
| --- | --- | --- |
| peerAddress | <code>string</code> | peer device address |

<a name="WpaCli+peerConnectPBC"></a>

### wpaCli.peerConnectPBC(peerAddress, isOwner) ⇒ <code>Promise</code>
connect to peer with PBC(Push Button Control) authentication mechanism

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  

| Param | Type | Description |
| --- | --- | --- |
| peerAddress | <code>string</code> | Mac Address of peer |
| isOwner | <code>Boolean</code> | Your role, are you group owner? if yes then true else false |

<a name="WpaCli+peerConnectPIN"></a>

### wpaCli.peerConnectPIN(peerAddress, pin, isOwner) ⇒ <code>Promise</code>
connect to peer with PIN(password) authentication mechanism

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  

| Param | Type | Description |
| --- | --- | --- |
| peerAddress | <code>string</code> | Mac Address of peer |
| pin | <code>string</code> | password for authentication |
| isOwner | <code>Boolean</code> | Your role, are you group owner? if yes then true else false |

<a name="WpaCli+listInterfaces"></a>

### wpaCli.listInterfaces() ⇒ <code>Promise</code>
list network interfaces on system

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  
<a name="WpaCli+removeVitualInterface"></a>

### wpaCli.removeVitualInterface(iFaceName, callback) ⇒ <code>Promise</code>
Remove virtual interface eg: p2p-p2p0-1

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  

| Param | Type | Description |
| --- | --- | --- |
| iFaceName | <code>string</code> | interface name |
| callback | <code>function</code> | callback function |

<a name="WpaCli+flushPeers"></a>

### wpaCli.flushPeers() ⇒ <code>Promise</code>
Flush peer data

**Kind**: instance method of <code>[WpaCli](#WpaCli)</code>  
