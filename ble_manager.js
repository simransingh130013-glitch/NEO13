/* NEO 13 BLE Manager — Enhanced Discovery
 * Generic Web Bluetooth layer. No proprietary UUIDs are invented.
 * Standard profile probing + user-supplied real UUIDs are supported.
 */
(function () {
  const STANDARD = {
    battery: { service: 'battery_service', characteristic: 'battery_level' },
    heartRate: { service: 'heart_rate', characteristic: 'heart_rate_measurement' },
    deviceInfo: 'device_information',
    healthThermometer: 'health_thermometer',
    bloodPressure: 'blood_pressure',
    pulseOximeter: 'pulse_oximeter',
    currentTime: 'current_time',
    humanInterface: 'human_interface_device',
    runningCadence: 'running_speed_and_cadence',
    cyclingPower: 'cycling_power',
    environmentalSensing: 'environmental_sensing',
    bodyComposition: 'body_composition',
    weightScale: 'weight_scale',
    userData: 'user_data'
  };

  const DEFAULT_OPTIONAL_SERVICES = [
    STANDARD.battery.service,
    STANDARD.heartRate.service,
    STANDARD.deviceInfo,
    STANDARD.healthThermometer,
    STANDARD.bloodPressure,
    STANDARD.pulseOximeter,
    STANDARD.currentTime,
    STANDARD.humanInterface,
    STANDARD.runningCadence,
    STANDARD.cyclingPower,
    STANDARD.environmentalSensing,
    STANDARD.bodyComposition,
    STANDARD.weightScale,
    STANDARD.userData
  ];

  function normalizeUuid(value) {
    return String(value || '').trim().toLowerCase();
  }

  function isUuidLike(value) {
    const v = normalizeUuid(value);
    return /^[0-9a-f]{4}$/.test(v) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
  }

  class NEO13BLEManager extends EventTarget {
    constructor() {
      super();
      this.device = null;
      this.server = null;
      this.services = [];
      this.characteristics = [];
      this.subscriptions = new Map();
      this.lastPacket = null;
      this.customServiceUuids = [];
      this._disconnectHandler = this.handleDisconnect.bind(this);
    }

    isSupported() {
      return !!(navigator.bluetooth && navigator.bluetooth.requestDevice);
    }

    emit(type, detail = {}) {
      this.dispatchEvent(new CustomEvent(type, { detail }));
    }

    setCustomServiceUuids(uuids) {
      this.customServiceUuids = Array.from(new Set((uuids || []).map(normalizeUuid).filter(isUuidLike)));
      return this.customServiceUuids.slice();
    }

    getOptionalServices() {
      return Array.from(new Set([...DEFAULT_OPTIONAL_SERVICES, ...this.customServiceUuids]));
    }

    async connect() {
      if (!this.isSupported()) {
        throw new Error('Web Bluetooth is not supported by this browser/platform.');
      }

      this.emit('status', { state: 'connecting' });
      this.emit('discoveryState', { message: 'OPENING BLUETOOTH DEVICE SELECTOR...' });

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: this.getOptionalServices()
      });

      this.device = device;
      this.device.addEventListener('gattserverdisconnected', this._disconnectHandler);

      this.emit('device', {
        name: device.name || 'UNKNOWN DEVICE',
        id: device.id || 'N/A'
      });

      if (!device.gatt) throw new Error('Selected device does not expose GATT.');

      this.emit('discoveryState', { message: 'GATT CONNECTING...' });
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
      this.emit('discoveryState', { message: 'DISCOVERING PERMITTED GATT SERVICES...' });

      let serviceObjects = [];
      try {
        if (typeof this.server.getPrimaryServices === 'function') {
          serviceObjects = await this.server.getPrimaryServices();
        }
      } catch (error) {
        this.emit('error', { scope: 'serviceDiscovery', error });
      }

      // Fallback: probe each standard/custom UUID individually.
      if (!serviceObjects.length) {
        for (const uuid of this.getOptionalServices()) {
          try {
            const service = await this.server.getPrimaryService(uuid);
            if (!serviceObjects.some(s => s.uuid === service.uuid)) serviceObjects.push(service);
          } catch (_) {}
        }
      }

      for (const service of serviceObjects) {
        const serviceRecord = {
          uuid: service.uuid,
          isPrimary: true,
          characteristics: []
        };

        let chars = [];
        try {
          chars = await service.getCharacteristics();
        } catch (error) {
          this.emit('error', { scope: 'characteristicDiscovery', error, serviceUuid: service.uuid });
        }

        for (const characteristic of chars) {
          const properties = Object.keys(characteristic.properties || {}).filter(k => characteristic.properties[k]);
          const record = {
            uuid: characteristic.uuid,
            properties,
            serviceUuid: service.uuid,
            characteristic
          };
          serviceRecord.characteristics.push(record);
          this.characteristics.push(record);

          // Subscribe to every NOTIFY/INDICATE characteristic that the browser exposes.
          if (characteristic.properties?.notify || characteristic.properties?.indicate) {
            try {
              await characteristic.startNotifications();
              characteristic.addEventListener('characteristicvaluechanged', event => {
                const value = event.target.value;
                this.capturePacket(characteristic.uuid, value, {
                  serviceUuid: service.uuid,
                  properties
                });
              });
              this.subscriptions.set(characteristic.uuid, characteristic);
            } catch (error) {
              this.emit('error', { scope: 'notification', error, characteristicUuid: characteristic.uuid });
            }
          }
        }

        this.services.push(serviceRecord);
      }

      this.emit('discovery', {
        services: this.services,
        characteristics: this.characteristics,
        optionalServices: this.getOptionalServices(),
        customServiceUuids: this.customServiceUuids.slice()
      });
      this.emit('discoveryState', {
        message: this.services.length
          ? `${this.services.length} SERVICE(S) / ${this.characteristics.length} CHARACTERISTIC(S) DISCOVERED.`
          : 'NO PERMITTED GATT SERVICES EXPOSED BY THIS DEVICE.'
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
      if (heartRate) {
        // Discovery already subscribes to notifications; parse the standard HR payload here too.
        if (heartRate.properties.notify && !this.subscriptions.has(heartRate.uuid)) {
          try {
            await heartRate.startNotifications();
            heartRate.addEventListener('characteristicvaluechanged', event => {
              const value = event.target.value;
              const bpm = this.parseHeartRate(value);
              this.capturePacket('HEART RATE', value);
              if (bpm != null) this.emit('heartRate', { bpm });
            });
            this.subscriptions.set(heartRate.uuid, heartRate);
          } catch (error) {
            this.emit('error', { scope: 'heartRate', error });
          }
        }
      }
    }

    findCharacteristic(shortOrFullUuid) {
      const needle = normalizeUuid(shortOrFullUuid);
      return this.characteristics.find(c =>
        normalizeUuid(c.uuid) === needle || normalizeUuid(c.uuid).includes(needle)
      )?.characteristic || null;
    }

    async readBattery(characteristic) {
      const value = await characteristic.readValue();
      this.capturePacket('BATTERY', value, { serviceUuid: STANDARD.battery.service });
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

    capturePacket(label, dataView, meta = {}) {
      const bytes = [];
      for (let i = 0; i < dataView.byteLength; i++) {
        bytes.push(dataView.getUint8(i).toString(16).padStart(2, '0'));
      }
      this.lastPacket = {
        label,
        hex: bytes.join(' '),
        byteLength: dataView.byteLength,
        timestamp: new Date().toISOString(),
        ...meta
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
      } else {
        this.handleDisconnect();
      }
    }
  }

  window.NEO13BLE = new NEO13BLEManager();
})();
