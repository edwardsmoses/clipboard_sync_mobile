// Expo config plugin to force cleartext WebSocket support in release builds.
// - Sets android:usesCleartextTraffic and android:networkSecurityConfig on the Application
// - Writes res/xml/network_security_config.xml with cleartextTrafficPermitted="true"

const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/** @type {import('@expo/config-plugins').ConfigPlugin} */
module.exports = function withAllowCleartext(config) {
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults; // Parsed AndroidManifest.xml
    // Ensure tools namespace for tools:replace
    if (!androidManifest.manifest.$) androidManifest.manifest.$ = {};
    androidManifest.manifest.$['xmlns:tools'] = androidManifest.manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);
    if (!app.$) app.$ = {};

    // Set attributes
    app.$['android:usesCleartextTraffic'] = 'true';
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';

    // Ensure tools:replace contains both attrs
    const existingReplace = (app.$['tools:replace'] || '').split(',').map((s) => s.trim()).filter(Boolean);
    for (const attr of ['android:usesCleartextTraffic', 'android:networkSecurityConfig']) {
      if (!existingReplace.includes(attr)) existingReplace.push(attr);
    }
    app.$['tools:replace'] = existingReplace.join(',');

    // Also write the XML file using a dangerous mod
    return config;
  });

  // Write res/xml/network_security_config.xml after prebuild generated native project
  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const androidRoot = cfg.modRequest.platformProjectRoot;
      const xmlDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'xml');
      const xmlPath = path.join(xmlDir, 'network_security_config.xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      const xml = `<?xml version="1.0" encoding="utf-8"?>\n<network-security-config>\n    <base-config cleartextTrafficPermitted=\"true\" />\n</network-security-config>\n`;
      fs.writeFileSync(xmlPath, xml);
      return cfg;
    },
  ]);

  return config;
};

// no-op helper kept for backwards compatibility if needed
