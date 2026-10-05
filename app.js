/* =========================================
   NEO 13 — HOLOGRAPHIC CONTROL + BLE SYSTEM
========================================= */

const mainInterface = document.getElementById("mainInterface");
const controlCenter = document.getElementById("controlCenter");
const backButton = document.getElementById("backButton");

const controlTitle = document.getElementById("controlTitle");
const controlHeading = document.getElementById("controlHeading");
const controlDescription = document.getElementById("controlDescription");
const controlNumber = document.getElementById("controlNumber");
const controlSignal = document.getElementById("controlSignal");
const controlEnergy = document.getElementById("controlEnergy");
const controlTemperature = document.getElementById("controlTemperature");
const moduleVisual = document.getElementById("moduleVisual");

const watch = {
    connect: document.getElementById("connectWatchButton"),
    disconnect: document.getElementById("disconnectWatchButton"),
    status: document.getElementById("watchStatusText"),
    name: document.getElementById("watchDeviceName"),
    badge: document.getElementById("dataModeBadge"),
    systemStatus: document.getElementById("systemStatus"),
    temperature: document.getElementById("temperature"),
    temperatureState: document.getElementById("temperatureState"),
    network: document.getElementById("networkStatus"),
    networkSubstatus: document.getElementById("networkSubstatus"),
    power: document.getElementById("powerStatus"),
    powerSubstatus: document.getElementById("powerSubstatus"),
    heartRate: document.getElementById("liveHeartRate"),
    battery: document.getElementById("liveBattery"),
    services: document.getElementById("liveServices"),
    debugServiceCount: document.getElementById("debugServiceCount"),
    debugCharacteristicCount: document.getElementById("debugCharacteristicCount"),
    debugPacketLabel: document.getElementById("debugPacketLabel"),
    debugOutput: document.getElementById("bleDebugOutput"),
    discoveryState: document.getElementById("bleDiscoveryState"),
    customServiceUuid: document.getElementById("customServiceUuid"),
    addServiceUuid: document.getElementById("addServiceUuidButton"),
    customUuidList: document.getElementById("customUuidList"),
    clearDebug: document.getElementById("clearBleDebugButton"),
    copyDebug: document.getElementById("copyBleDebugButton")
};

const energyCore = document.getElementById("energyCore");
const coreState = document.getElementById("coreState");
const energyReadout = document.getElementById("energy");
const temperatureReadout = document.getElementById("temperature");
const particleContainer = document.getElementById("particles");

const neo13Data = {
    mode: "demo",
    connection: { connected: false, deviceName: "" },
    health: { heartRate: null },
    battery: { level: null },
    system: { temperature: null },
    ble: { services: [], characteristics: [], lastPacket: null }
};

const moduleData = {
    communication: {
        number: "01",
        title: "COMM LINK",
        description: "Bluetooth communication interface. NEO 13 can discover and synchronize compatible BLE devices without inventing unsupported commands."
    },
    health: {
        number: "02",
        title: "HEALTH",
        description: "Biometric interface. Standard BLE heart-rate data is shown only when the connected device actually exposes the Heart Rate service."
    },
    gesture: {
        number: "03",
        title: "GESTURE",
        description: "Motion-control interface. Gesture data remains unavailable until the connected watch exposes a supported movement or sensor protocol."
    },
    system: {
        number: "04",
        title: "SYSTEM",
        description: "Core diagnostics, Bluetooth state, service discovery and device telemetry are available here."
    },
    energy: {
        number: "05",
        title: "ENERGY CORE",
        description: "Power telemetry. Standard BLE Battery Service data is used when available; otherwise the battery is shown as unavailable."
    },
    neural: {
        number: "06",
        title: "NEURAL LINK",
        description: "The Neural Link represents the NEO 13 data-processing layer. It does not connect to the human brain."
    },
    status: {
        number: "SYS",
        title: "SYSTEM STATUS",
        description: "NEO 13 status overview, including the current Bluetooth link, live data mode and available device channels."
    }
};

const moduleTelemetryDemo = {
    communication: ["99.2%", "87%", "--°C"],
    health: ["98.4%", "84%", "--°C"],
    gesture: ["96.8%", "89%", "--°C"],
    system: ["99.8%", "87%", "--°C"],
    energy: ["100%", "87%", "--°C"],
    neural: ["97.9%", "91%", "--°C"],
    status: ["99.8%", "87%", "--°C"]
};

function setText(element, value) {
    if (element) element.textContent = value;
}

function setMode(mode) {
    neo13Data.mode = mode;
    setText(watch.badge, mode === "live" ? "LIVE DATA" : "DEMO DATA");
    if (watch.badge) watch.badge.classList.toggle("live", mode === "live");
}

function formatServices() {
    return neo13Data.ble.services.length;
}

function updateMainUI() {
    const connected = neo13Data.connection.connected;
    const battery = neo13Data.battery.level;
    const hr = neo13Data.health.heartRate;

    setText(watch.systemStatus, connected ? "WATCH LINK ACTIVE" : "DEMO MODE");
    setText(watch.network, connected ? "BLE CONNECTED" : "BLE OFFLINE");
    setText(watch.networkSubstatus, connected ? `${formatServices()} SERVICES DISCOVERED` : "WAITING FOR WATCH");
    setText(watch.power, battery != null ? `${battery}%` : (connected ? "BATTERY N/A" : "DEMO 87%"));
    setText(watch.powerSubstatus, battery != null ? "LIVE WATCH BATTERY" : (connected ? "WATCH DATA UNAVAILABLE" : "CONNECT WATCH FOR LIVE BATTERY"));
    setText(watch.heartRate, hr != null ? `${hr} BPM` : "-- BPM");
    setText(watch.battery, battery != null ? `${battery}%` : "--%");
    setText(watch.services, String(formatServices()));
    setText(watch.name, neo13Data.connection.deviceName || "NOT CONNECTED");

    setText(watch.temperature, neo13Data.system.temperature != null ? `${neo13Data.system.temperature}°C` : "--°C");
    setText(watch.temperatureState, neo13Data.system.temperature != null ? "LIVE SENSOR" : "WATCH DATA UNAVAILABLE");

    if (energyReadout) energyReadout.textContent = battery != null ? `${battery}%` : (connected ? "--" : "87%");
    if (temperatureReadout) temperatureReadout.textContent = neo13Data.system.temperature != null ? `${neo13Data.system.temperature}°C` : "--°C";
}

function setModuleVisual(moduleName) {
    if (!moduleVisual) return;
    moduleVisual.className = "module-visual " + moduleName;

    const demo = moduleTelemetryDemo[moduleName] || moduleTelemetryDemo.system;
    const signal = neo13Data.connection.connected ? "LIVE" : demo[0];
    const energy = neo13Data.battery.level != null ? `${neo13Data.battery.level}%` : (neo13Data.connection.connected ? "N/A" : demo[1]);
    const temp = neo13Data.system.temperature != null ? `${neo13Data.system.temperature}°C` : demo[2];

    setText(controlSignal, signal);
    setText(controlEnergy, energy);
    setText(controlTemperature, temp);
}

function openControlCenter(moduleName) {
    const module = moduleData[moduleName];
    if (!module) return;

    setText(controlNumber, module.number);
    setText(controlTitle, module.title);
    setText(controlHeading, module.title);
    setText(controlDescription, module.description);

    mainInterface.classList.add("interface-hidden");
    controlCenter.classList.add("control-active");
    setModuleVisual(moduleName);
    window.scrollTo({ top: 0, behavior: "instant" });
}

function closeControlCenter() {
    controlCenter.classList.remove("control-active");
    mainInterface.classList.remove("interface-hidden");
}

document.querySelectorAll("[data-control]").forEach(button => {
    button.addEventListener("click", () => openControlCenter(button.dataset.control));
});

backButton?.addEventListener("click", closeControlCenter);

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeControlCenter();
});

function toggleEnergyCore() {
    if (!energyCore) return;
    energyCore.classList.toggle("overdrive");
    const active = energyCore.classList.contains("overdrive");
    setText(coreState, active ? "● OVERDRIVE" : "● ACTIVE");
    if (neo13Data.battery.level == null) setText(energyReadout, active ? "100%" : "87%");
}

energyCore?.addEventListener("click", toggleEnergyCore);
energyCore?.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleEnergyCore();
    }
});

function createParticles() {
    if (!particleContainer) return;
    const amount = window.innerWidth < 600 ? 35 : 70;
    for (let i = 0; i < amount; i++) {
        const particle = document.createElement("div");
        particle.className = "particle";
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 5}s`;
        particle.style.animationDuration = `${3 + Math.random() * 5}s`;
        const size = 1 + Math.random() * 3;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particleContainer.appendChild(particle);
    }
}
createParticles();

/* =========================================
   REAL BLE WATCH INTEGRATION
========================================= */

async function connectWatch() {
    if (!window.NEO13BLE) {
        setText(watch.status, "BLE ENGINE NOT LOADED");
        return;
    }

    if (!window.NEO13BLE.isSupported()) {
        setText(watch.status, "WEB BLUETOOTH IS NOT AVAILABLE IN THIS BROWSER/PLATFORM.");
        setMode("demo");
        return;
    }

    watch.connect?.setAttribute("disabled", "disabled");
    window.NEO13BLE.setCustomServiceUuids(Array.from(customServiceUuids));
    setText(watch.status, "OPENING BLUETOOTH DEVICE SELECTOR...");
    setText(watch.discoveryState, "SELECT YOUR WATCH. STANDARD + CUSTOM SERVICE PROBES ARE READY.");

    try {
        await window.NEO13BLE.connect();
    } catch (error) {
        console.error("NEO 13 BLE connection error:", error);
        setText(watch.status, error?.message || "BLUETOOTH CONNECTION FAILED");
        setMode("demo");
    } finally {
        watch.connect?.removeAttribute("disabled");
    }
}

async function disconnectWatch() {
    try {
        await window.NEO13BLE?.disconnect();
    } catch (error) {
        console.error(error);
    }
}

watch.connect?.addEventListener("click", connectWatch);
watch.disconnect?.addEventListener("click", disconnectWatch);

const customServiceUuids = new Set();
function renderCustomUuidList() {
    if (!watch.customUuidList) return;
    watch.customUuidList.innerHTML = "";
    customServiceUuids.forEach(uuid => {
        const chip = document.createElement("span");
        chip.className = "ble-uuid-chip";
        chip.textContent = uuid;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "×";
        remove.title = "Remove UUID";
        remove.addEventListener("click", () => {
            customServiceUuids.delete(uuid);
            renderCustomUuidList();
        });
        chip.appendChild(remove);
        watch.customUuidList.appendChild(chip);
    });
}

watch.addServiceUuid?.addEventListener("click", () => {
    const uuid = watch.customServiceUuid?.value.trim().toLowerCase();
    const valid = /^[0-9a-f]{4}$/.test(uuid) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid);
    if (!valid) {
        setText(watch.discoveryState, "INVALID UUID — USE 4 HEX DIGITS OR A FULL 128-BIT UUID.");
        return;
    }
    customServiceUuids.add(uuid);
    if (watch.customServiceUuid) watch.customServiceUuid.value = "";
    renderCustomUuidList();
    setText(watch.discoveryState, "CUSTOM UUID ADDED. RECONNECT WATCH TO PROBE IT.");
});

watch.clearDebug?.addEventListener("click", () => {
    setText(watch.debugPacketLabel, "NONE");
    if (watch.debugOutput) watch.debugOutput.textContent = "LOG CLEARED. CONNECT WATCH TO START DISCOVERY.";
});

watch.copyDebug?.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(watch.debugOutput?.textContent || "");
        setText(watch.discoveryState, "BLE LOG COPIED TO CLIPBOARD.");
    } catch (_) {
        setText(watch.discoveryState, "CLIPBOARD COPY UNAVAILABLE IN THIS BROWSER.");
    }
});

if (window.NEO13BLE) {
    window.NEO13BLE.setCustomServiceUuids(Array.from(customServiceUuids));
    window.NEO13BLE.addEventListener("status", event => {
        const state = event.detail.state;
        if (state === "connecting") {
            setText(watch.status, "CONNECTING TO WATCH...");
        } else if (state === "connected") {
            neo13Data.connection.connected = true;
            setMode("live");
            setText(watch.status, "WATCH CONNECTED. DISCOVERING GATT SERVICES...");
            watch.connect?.setAttribute("hidden", "hidden");
            watch.disconnect?.removeAttribute("hidden");
        } else if (state === "disconnected") {
            neo13Data.connection.connected = false;
            neo13Data.connection.deviceName = "";
            neo13Data.health.heartRate = null;
            neo13Data.battery.level = null;
            neo13Data.ble.services = [];
            neo13Data.ble.characteristics = [];
            setMode("demo");
            setText(watch.status, "WATCH DISCONNECTED. DEMO DATA ACTIVE.");
            watch.connect?.removeAttribute("hidden");
            watch.disconnect?.setAttribute("hidden", "hidden");
            updateMainUI();
        }
        updateMainUI();
    });

    window.NEO13BLE.addEventListener("device", event => {
        neo13Data.connection.deviceName = event.detail.name;
        setText(watch.name, event.detail.name);
        setText(watch.status, "DEVICE SELECTED. CONNECTING GATT...");
        updateMainUI();
    });

    window.NEO13BLE.addEventListener("discoveryState", event => {
        setText(watch.discoveryState, event.detail.message || "BLE DISCOVERY ACTIVE.");
    });

    window.NEO13BLE.addEventListener("discovery", event => {
        neo13Data.ble.services = event.detail.services || [];
        neo13Data.ble.characteristics = event.detail.characteristics || [];
        setText(watch.status, `${neo13Data.ble.services.length} BLE SERVICES DISCOVERED.`);
        setText(watch.debugServiceCount, neo13Data.ble.services.length);
        setText(watch.debugCharacteristicCount, neo13Data.ble.characteristics.length);

        const lines = [];
        lines.push(`DEVICE: ${neo13Data.connection.deviceName || "UNKNOWN"}`);
        lines.push(`PERMITTED SERVICE PROBES: ${(event.detail.optionalServices || []).join(", ")}`);
        if (event.detail.customServiceUuids?.length) {
            lines.push(`CUSTOM UUID PROBES: ${event.detail.customServiceUuids.join(", ")}`);
        }
        lines.push("");
        neo13Data.ble.services.forEach(service => {
            lines.push(`SERVICE  ${service.uuid}`);
            service.characteristics.forEach(characteristic => {
                lines.push(`  └─ ${characteristic.uuid}`);
                lines.push(`     SERVICE: ${characteristic.serviceUuid}`);
                lines.push(`     PROPERTIES: ${characteristic.properties.join(" / ").toUpperCase() || "NONE"}`);
            });
        });
        watch.debugOutput.textContent = lines.length > 4 ? lines.join("\n") : "NO PERMITTED GATT SERVICES WERE EXPOSED. THE WATCH MAY USE A PROPRIETARY SERVICE. ADD ITS REAL SERVICE UUID ABOVE AND RECONNECT.";
        updateMainUI();
    });

    window.NEO13BLE.addEventListener("heartRate", event => {
        neo13Data.health.heartRate = event.detail.bpm;
        setText(watch.status, "LIVE HEART-RATE STREAM ACTIVE.");
        updateMainUI();
        setModuleVisual("health");
    });

    window.NEO13BLE.addEventListener("battery", event => {
        neo13Data.battery.level = Math.max(0, Math.min(100, event.detail.level));
        setText(watch.status, "LIVE BATTERY DATA RECEIVED.");
        updateMainUI();
        setModuleVisual("energy");
    });

    window.NEO13BLE.addEventListener("packet", event => {
        neo13Data.ble.lastPacket = event.detail;
        setText(watch.debugPacketLabel, event.detail.label);
        watch.debugOutput.textContent += `\n\n[${event.detail.label}]\nSERVICE: ${event.detail.serviceUuid || "UNKNOWN"}\nPROPERTIES: ${(event.detail.properties || []).join(" / ").toUpperCase() || "UNKNOWN"}\nBYTES: ${event.detail.byteLength ?? "?"}\nHEX: ${event.detail.hex}\n${event.detail.timestamp}`;
        if (watch.debugOutput.textContent.length > 9000) {
            watch.debugOutput.textContent = watch.debugOutput.textContent.slice(-9000);
        }
    });

    window.NEO13BLE.addEventListener("error", event => {
        console.warn("NEO 13 BLE:", event.detail.scope, event.detail.error);
        setText(watch.status, `BLE ${String(event.detail.scope).toUpperCase()} DATA UNAVAILABLE.`);
    });

    window.NEO13BLE.addEventListener("disconnect", () => {
        setText(watch.status, "WATCH LINK LOST.");
    });
}

updateMainUI();

console.log(`
╔══════════════════════════════════════╗
║              NEO 13                 ║
║   HOLOGRAPHIC CONTROL + BLE SYSTEM  ║
║                                      ║
║   LIVE HARDWARE LINK: READY          ║
║   STANDARD BLE PARSERS: ENABLED      ║
║   PROPRIETARY PROTOCOL: DISCOVERY    ║
╚══════════════════════════════════════╝
`);
