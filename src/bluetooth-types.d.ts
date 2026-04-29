/**
 * Web Bluetooth API type declarations
 *
 * The Web Bluetooth API is not yet fully typed in TypeScript's DOM lib.
 * These declarations enable strict-mode usage.
 */

interface BluetoothDevice {
  id: string
  name: string | null
  gatt: BluetoothRemoteGATTServer | null
  addEventListener(type: 'gattserverdisconnected', listener: () => void): void
  removeEventListener(type: 'gattserverdisconnected', listener: () => void): void
}

interface BluetoothRemoteGATTServer {
  connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>
}

interface BluetoothRemoteGATTService {
  getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>
}

interface BluetoothRemoteGATTCharacteristic {
  value: DataView | null
  addEventListener(type: 'characteristicvaluechanged', listener: (event: Event) => void): void
  removeEventListener(type: 'characteristicvaluechanged', listener: (event: Event) => void): void
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  writeValue(value: Uint8Array): Promise<void>
  readValue(): Promise<DataView>
}

interface BluetoothServiceUUID {
  toString(): string
  toJSON(): string
}

interface BluetoothDeviceFilter {
  name?: string
  namePrefix?: string
  services?: string[] | BluetoothServiceUUID[]
}

interface BluetoothOptions {
  filters?: BluetoothDeviceFilter[]
  optionalServices?: string[]
}

interface NavigatorBluetooth {
  requestDevice(options: BluetoothOptions): Promise<BluetoothDevice>
}

interface Navigator {
  bluetooth?: NavigatorBluetooth
}
