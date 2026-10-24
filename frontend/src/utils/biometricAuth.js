import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

const SERVER_KEY = 'com.nexuswealth.app';
const BIOMETRIC_ENABLED_KEY = 'nexus_biometric_enabled';
const BIOMETRIC_USER_KEY = 'nexus_biometric_user';

export const isBiometricAvailable = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      const result = await NativeBiometric.isAvailable();
      return !!result.isAvailable;
    }
    if (window.PublicKeyCredential && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch (err) {
    console.warn('Biometric availability check failed:', err);
  }
  return false;
};

export const verifyBiometrics = async (reason = 'Confirm your fingerprint to unlock NexusWealth') => {
  try {
    if (Capacitor.isNativePlatform()) {
      await NativeBiometric.verifyIdentity({
        reason,
        title: 'NexusWealth Security',
        subtitle: 'Biometric verification',
        description: reason,
        negativeButton: 'Use Passcode'
      });
      return { success: true };
    }

    // Web platform fallback using WebAuthn / platform authenticator
    if (window.PublicKeyCredential) {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required'
        }
      });
      if (credential) {
        return { success: true };
      }
    }
    return { success: false, error: 'WebAuthn not supported or canceled' };
  } catch (err) {
    return {
      success: false,
      error: err?.message || 'Biometric authentication cancelled'
    };
  }
};

export const saveBiometricSession = async (email, token) => {
  try {
    if (Capacitor.isNativePlatform()) {
      await NativeBiometric.setCredentials({
        server: SERVER_KEY,
        username: email,
        password: token
      });
    }
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    localStorage.setItem(BIOMETRIC_USER_KEY, email);
    return true;
  } catch (err) {
    console.error('Failed to save biometric credentials:', err);
    return false;
  }
};

export const getBiometricSession = async () => {
  try {
    const isEnabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
    const email = localStorage.getItem(BIOMETRIC_USER_KEY);
    if (!isEnabled) return null;

    if (Capacitor.isNativePlatform()) {
      const creds = await NativeBiometric.getCredentials({ server: SERVER_KEY });
      if (creds && creds.password) {
        return { email: creds.username || email, token: creds.password };
      }
    }
    return { email, token: null };
  } catch (err) {
    console.warn('Failed to retrieve biometric session:', err);
    return null;
  }
};

export const clearBiometricSession = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await NativeBiometric.deleteCredentials({ server: SERVER_KEY });
    }
  } catch (err) {
    console.warn('Error clearing biometric session:', err);
  } finally {
    localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    localStorage.removeItem(BIOMETRIC_USER_KEY);
  }
};
