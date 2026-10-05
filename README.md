# NEO 13 — BLE Smartwatch Ready

NEO 13 is a futuristic holographic interface with a real Web Bluetooth connection layer.

## What is real

- Bluetooth permission is requested only after **CONNECT WATCH** is pressed.
- The selected BLE device is connected through GATT when supported.
- NEO 13 discovers the standard services it has permission to access.
- Standard Battery Service (`180F` / Battery Level `2A19`) is read when available.
- Standard Heart Rate Service (`180D` / Heart Rate Measurement `2A37`) is subscribed to when available.
- Raw received packets are displayed in the BLE discovery/debug panel.
- The UI switches between **DEMO DATA** and **LIVE DATA**.

## Important smartwatch limitation

Smartwatches do not share one universal BLE protocol. Many watches use proprietary services and encrypted or vendor-specific packets. NEO 13 therefore does **not** invent UUIDs or pretend proprietary data is supported.

For a proprietary watch, first connect it and inspect the BLE information that the browser exposes. Once the exact service/characteristic UUIDs and packet format are known, a device profile/parser can be added safely.

## How to run

Web Bluetooth generally requires a secure context. For local development, use `localhost` rather than opening `index.html` directly with `file://`.

From this folder, for example:

```bash
python -m http.server 8000
```

Then open:

`http://localhost:8000`

Use a browser/platform that supports Web Bluetooth. If Bluetooth is unavailable, the holographic UI still works in Demo Data mode.

## How to test

1. Start the local server.
2. Open NEO 13.
3. Press **CONNECT WATCH**.
4. Select the smartwatch.
5. Wait for GATT service discovery.
6. Open a module and inspect **BLE DISCOVERY**.
7. If Battery or Heart Rate are exposed through the standard services, their values will appear as LIVE DATA.
8. If only proprietary services exist or the browser cannot expose them, NEO 13 will report that rather than inventing data.

## Next stage for a proprietary watch

Record:
- exact watch model
- discovered service UUIDs
- characteristic UUIDs
- READ / WRITE / NOTIFY properties
- raw hexadecimal packets

Those details are enough to build a dedicated parser/profile when the protocol is understood.
