import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import uuid from 'react-native-uuid';

const DEVICE_ID_KEY = 'device.identity';

export interface DeviceIdentity {
  id: string;
  name: string;
  platform: string;
}

async function resolveDefaultName(): Promise<string> {
  const constantsName = Constants.deviceName ?? Constants.expoConfig?.name;
  if (constantsName) {
    return constantsName;
  }
  return Platform.OS === 'ios' ? 'iOS device' : `${Platform.OS} device`;
}

export async function getDeviceIdentity(): Promise<DeviceIdentity> {
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as DeviceIdentity;
      if (parsed.id && parsed.name) {
        return parsed;
      }
    } catch (error) {
      console.warn('[identity] Failed to parse stored identity', error);
    }
  }

  const identity: DeviceIdentity = {
    id: uuid.v4().toString(),
    name: await resolveDefaultName(),
    platform: Platform.OS,
  };

  await AsyncStorage.setItem(DEVICE_ID_KEY, JSON.stringify(identity));
  return identity;
}

export async function updateDeviceName(name: string): Promise<DeviceIdentity> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Device name cannot be empty');
  }
  const current = await getDeviceIdentity();
  const updated = { ...current, name: trimmed } satisfies DeviceIdentity;
  await AsyncStorage.setItem(DEVICE_ID_KEY, JSON.stringify(updated));
  return updated;
}
