# NEO 13 — BLE Discovery Edition

This build keeps the NEO 13 holographic interface and adds a stronger smartwatch BLE discovery/debug workflow.

## What it does
- Connects to a BLE/GATT device using Web Bluetooth.
- Probes common standard Bluetooth services (battery, heart rate, device information, thermometer, blood pressure, pulse oximeter and other common profiles).
- Enumerates permitted primary services and characteristics when the browser exposes them.
- Automatically subscribes to exposed NOTIFY/INDICATE characteristics and prints raw hexadecimal packets in the developer panel.
- Supports adding a real custom service UUID before reconnecting.
- Keeps demo mode when no live telemetry is available.

## Important limitation
A smartwatch can expose a proprietary BLE service that is not a standard Bluetooth profile. A browser cannot safely invent or guess that UUID. If the watch's companion app or another BLE scanner reveals a real custom service UUID, enter it in **BLE DISCOVERY / DEVELOPER MODE**, add it, disconnect, and reconnect the watch. NEO 13 will then request permission for that service and attempt to inspect its characteristics.

## Testing
Use an HTTPS deployment (GitHub Pages is suitable) or a browser context that supports Web Bluetooth. On Android, use Chrome with Bluetooth enabled.

## Live data
Real heart-rate and battery values are shown only when the connected device actually exposes compatible characteristics. Unknown/proprietary packets are displayed as raw hex; NEO 13 does not label them as heart rate, steps, battery, etc. until a parser is verified.
