/* NEO 13 BLE Manager
 * Generic Web Bluetooth layer. It intentionally does not invent proprietary
 * smartwatch UUIDs. Standard Battery + Heart Rate services are supported.
 */
(function () {
  const STANDARD = {
    battery: {
      service: 'battery_service',
      characteristic: 'battery_level'
    },
    heartRate: {
      service: 'heart_rate',
      characteristic: 'heart_rate_measurement'
    },
    deviceInfo: 'device_information'
  };

  class NEO13BLEManager extends EventTarget {
    constructor() {
      super();
      this.device = null;
      this.server = null;
      this.services = [];
      this.characteristics = [];
      this.subscriptions = new Map();
      this.lastPacket = null;
      this._disconnectHandler = this.handleDisconnect.bind(this);
    }

    isSupported() {
      return !!(navigator.bluetooth && navigator.bluetooth.requestDevice);
    }

    emit(type, detail = {}) {
      this.dispatchEvent(new CustomEvent(type, { detail }));
    }

    async connect() {
      if (!this.isSupported()) {
        throw new Error('Web Bluetooth is not supported by this browser/platform.');
      }

      this.emit('status', { state: 'connecting' });

      // Standard services are explicitly requested. Proprietary services
      // require their UUIDs to be known and added to optionalServices.
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          STANDARD.battery.service,
          STANDARD.heartRate.service,
          STANDARD.deviceInfo
        ]
      });

      this.device = device;
      this.device.addEventListener('gattserverdisconnected', this._disconnectHandler);

      this.emit('device', {
        name: device.name || 'UNKNOWN DEVICE',
        id: device.id || 'N/A'
      });

      if (!device.gatt) throw new Error('Selected device does not expose GATT.');

      this.server = await device.gatt.connect();
      this.emit('status', { state: 'connected' });

      await this.discoverServices();
      await this.attachStandardServices();

      this.emit('ready', {
        device: this.device,
        services: this.services,
        characteristics: this.characteristics
      });

      return this.device;
    }

    async discoverServices() {
      if (!this.server) return;
      this.services = [];
      this.characteristics = [];

      // getPrimaryServices() can only return services that the browser has
      // permission to expose. Unknown proprietary services need known UUIDs.
      const serviceIds = [
        STANDARD.battery.service,
        STANDARD.heartRate.service,
        STANDARD.deviceInfo
      ];

      for (const uuid of serviceIds) {
        try {
          const service = await this.server.getPrimaryService(uuid);
          const serviceRecord = {
            uuid: service.uuid,
            characteristics: []
          };
          const chars = await service.getCharacteristics();
          for (const characteristic of chars) {
            const record = {
              uuid: characteristic.uuid,
              properties: Object.keys(characteristic.properties || {}).filter(k => characteristic.properties[k]),
              characteristic
            };
            serviceRecord.characteristics.push(record);
            this.characteristics.push(record);
          }
          this.services.push(serviceRecord);
        } catch (_) {
          // Service not exposed by this device; this is normal.
        }
      }

      this.emit('discovery', {
        services: this.services,
        characteristics: this.characteristics
      });
    }

    async attachStandardServices() {
      const battery = this.findCharacteristic(STANDARD.battery.characteristic);
      if (battery) {
        try {
          await this.readBattery(battery);
        } catch (error) {
          this.emit('error', { scope: 'battery', error });
        }
      }

      const heartRate = this.findCharacteristic(STANDARD.heartRate.characteristic);
      if (heartRate && heartRate.properties.notify) {
        try {
          await heartRate.startNotifications();
          heartRate.addEventListener('characteristicvaluechanged', (event) => {
            const value = event.target.value;
            this.capturePacket('HEART RATE', value);
            const bpm = this.parseHeartRate(value);
            if (bpm != null) this.emit('heartRate', { bpm });
          });
          this.subscriptions.set(heartRate.uuid, heartRate);
        } catch (error) {
          this.emit('error', { scope: 'heartRate', error });
        }
      }
    }

    findCharacteristic(shortOrFullUuid) {
      return this.characteristics.find(c =>
        c.uuid.toLowerCase() === shortOrFullUuid.toLowerCase() ||
        c.uuid.toLowerCase().includes(shortOrFullUuid.toLowerCase())
      )?.characteristic || null;
    }

    async readBattery(characteristic) {
      const value = await characteristic.readValue();
      this.capturePacket('BATTERY', value);
      const level = value.getUint8(0);
      if (Number.isFinite(level)) this.emit('battery', { level });
    }

    parseHeartRate(dataView) {
      if (!dataView || dataView.byteLength < 2) return null;
      const flags = dataView.getUint8(0);
      const is16Bit = (flags & 0x01) !== 0;
      return is16Bit && dataView.byteLength >= 3
        ? dataView.getUint16(1, true)
        : dataView.getUint8(1);
    }

    capturePacket(label, dataView) {
      const bytes = [];
      for (let i = 0; i < dataView.byteLength; i++) {
        bytes.push(dataView.getUint8(i).toString(16).padStart(2, '0'));
      }
      this.lastPacket = {
        label,
        hex: bytes.join(' '),
        timestamp: new Date().toISOString()
      };
      this.emit('packet', this.lastPacket);
    }

    handleDisconnect() {
      this.emit('status', { state: 'disconnected' });
      this.emit('disconnect', { name: this.device?.name || 'UNKNOWN DEVICE' });
      this.server = null;
      this.services = [];
      this.characteristics = [];
      this.subscriptions.clear();
    }

    async disconnect() {
      if (this.device?.gatt?.connected) {
        this.device.gatt.disconnect();
      }
      this.handleDisconnect();
    }
  }

  window.NEO13BLE = new NEO13BLEManager();
})();
