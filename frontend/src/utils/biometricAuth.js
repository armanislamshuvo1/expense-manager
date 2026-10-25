import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

const SERVER_KEY = 'com.nexuswealth.app';
const BIOMETRIC_ENABLED_KEY = 'nexus_biometric_enabled';
const BIOMETRIC_USER_KEY = 'nexus_biometric_user';
const WEBAUTHN_CRED_ID_KEY = 'nexus_webauthn_cred_id';

const bufferToBase64Url = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const base64UrlToBuffer = (base64url) => {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
};

export const isBiometricAvailable = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await NativeBiometric.isAvailable();
        if (result && result.isAvailable) return true;
      } catch (_nativeErr) {
        // Fallback to WebAuthn check if native plugin not compiled into shell
      }
    }
    if (
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch (err) {
    console.warn('Biometric availability check failed:', err);
  }
  return false;
};

const verifyViaWebAuthn = async (email = 'user@nexuswealth.app') => {
  if (!window.PublicKeyCredential || !navigator.credentials) {
    return {
      success: false,
      error: 'Biometric hardware or platform authenticator is not available on this device.'
    };
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const existingCredId = localStorage.getItem(WEBAUTHN_CRED_ID_KEY);

  // If we already registered a local platform credential on this device, verify with it
  if (existingCredId) {
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [
            {
              id: base64UrlToBuffer(existingCredId),
              type: 'public-key',
              transports: ['internal']
            }
          ],
          userVerification: 'required',
          timeout: 60000
        }
      });
      if (assertion) {
        return { success: true };
      }
    } catch (err) {
      // If user explicitly cancelled the prompt, surface cancellation
      if (err?.name === 'NotAllowedError') {
        return { success: false, error: 'Fingerprint verification was canceled or timed out.' };
      }
      // If credential was cleared from OS keystore, clear stored ID and fall through to create
      localStorage.removeItem(WEBAUTHN_CRED_ID_KEY);
    }
  }

  // Register a new platform authenticator credential (triggers device fingerprint / FaceID / Windows Hello)
  const userId = new Uint8Array(16);
  window.crypto.getRandomValues(userId);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'NexusWealth Security',
        id: window.location.hostname || 'localhost'
      },
      user: {
        id: userId,
        name: email,
        displayName: email.split('@')[0] || 'NexusWealth User'
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' }  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred'
      },
      timeout: 60000
    }
  });

  if (credential && credential.rawId) {
    localStorage.setItem(WEBAUTHN_CRED_ID_KEY, bufferToBase64Url(credential.rawId));
    return { success: true };
  }

  return { success: false, error: 'Could not verify fingerprint.' };
};

export const verifyBiometrics = async (
  reason = 'Confirm your fingerprint to unlock NexusWealth',
  email = 'user@nexuswealth.app'
) => {
  try {
    if (Capacitor.isNativePlatform()) {
      try {
        const avail = await NativeBiometric.isAvailable();
        if (avail && avail.isAvailable) {
          await NativeBiometric.verifyIdentity({
            reason,
            title: 'NexusWealth Security',
            subtitle: 'Fingerprint Verification',
            description: reason,
            negativeButtonText: 'Cancel'
          });
          return { success: true };
        }
      } catch (nativeErr) {
        const msg = String(nativeErr?.message || '');
        // If native plugin is not linked or unavailable, try WebAuthn; otherwise surface user cancellation
        const isPluginMissing =
          msg.includes('not implemented') ||
          msg.includes('UNIMPLEMENTED') ||
          msg.includes('plugin is not');
        if (!isPluginMissing) {
          return {
            success: false,
            error: nativeErr?.message || 'Fingerprint verification canceled.'
          };
        }
      }
    }

    return await verifyViaWebAuthn(email);
  } catch (err) {
    return {
      success: false,
      error:
        err?.name === 'NotAllowedError'
          ? 'Fingerprint prompt was dismissed or not configured on this device.'
          : err?.message || 'Biometric authentication failed.'
    };
  }
};

export const saveBiometricSession = async (email, token) => {
  try {
    if (Capacitor.isNativePlatform()) {
      try {
        await NativeBiometric.setCredentials({
          server: SERVER_KEY,
          username: email,
          password: token
        });
      } catch (_e) {
        // Fallback to local storage reference if native keystore plugin not linked
      }
    }
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    if (email) localStorage.setItem(BIOMETRIC_USER_KEY, email);
    if (token) localStorage.setItem('nexus_biometric_token', token);
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
    const fallbackToken = localStorage.getItem('nexus_biometric_token');
    if (!isEnabled) return null;

    if (Capacitor.isNativePlatform()) {
      try {
        const creds = await NativeBiometric.getCredentials({ server: SERVER_KEY });
        if (creds && creds.password) {
          return { email: creds.username || email, token: creds.password };
        }
      } catch (_e) {
        // Fallback to stored token
      }
    }
    return { email, token: fallbackToken };
  } catch (err) {
    console.warn('Failed to retrieve biometric session:', err);
    return null;
  }
};

export const clearBiometricSession = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      try {
        await NativeBiometric.deleteCredentials({ server: SERVER_KEY });
      } catch (_e) {}
    }
  } catch (err) {
    console.warn('Error clearing biometric session:', err);
  } finally {
    localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    localStorage.removeItem(BIOMETRIC_USER_KEY);
    localStorage.removeItem('nexus_biometric_token');
  }
};
