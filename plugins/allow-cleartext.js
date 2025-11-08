// Expo config plugin to force cleartext WebSocket support in release builds.
// - Sets android:usesCleartextTraffic and android:networkSecurityConfig on the Application
// - Writes res/xml/network_security_config.xml with cleartextTrafficPermitted="true"

const { withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/** @type {import('@expo/config-plugins').ConfigPlugin} */
module.exports = function withAllowCleartext(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    // Ensure tools namespace for tools:replace
    if (!manifest.$) manifest.$ = {};
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';

    const app = getMainApplication(manifest);
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
  config = withDangerousAndroidWrite(config, () => {
    const androidRoot = config.modRequest.platformProjectRoot;
    const xmlDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'xml');
    const xmlPath = path.join(xmlDir, 'network_security_config.xml');
    fs.mkdirSync(xmlDir, { recursive: true });
    const xml = `<?xml version="1.0" encoding="utf-8"?>\n<network-security-config>\n    <base-config cleartextTrafficPermitted="true" />\n</network-security-config>\n`;
    fs.writeFileSync(xmlPath, xml);
  });

  return config;
};

function getMainApplication(manifest) {
  const app = manifest.application && manifest.application[0];
  if (!app) {
    throw new Error('Android manifest is missing <application>');
  }
  return app;
}

function withDangerousAndroidWrite(config, action) {
  return require('@expo/config-plugins').withDangerousMod(config, [
    'android',
    (cfg) => {
      action(cfg);
      return cfg;
    },
  ]);
}

