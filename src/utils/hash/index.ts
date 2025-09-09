import firestore from '@react-native-firebase/firestore';
import CryptoJS from 'crypto-js';
import {ENV} from '../../../utils';
import auth from '@react-native-firebase/auth';

const ENCRYPTION_KEY = 'AiPresentation-SecureKey-2024';

export const hashEmail = (email: string): string => {
  return CryptoJS.SHA256(email + ENCRYPTION_KEY).toString();
};

// Helper functions for encryption and hash management
export const encryptEmail = (email: string): string => {
  try {
    // For simplicity and consistency, just use a hash
    return hashEmail(email);

    // The below encryption code is kept for reference but not used
    /*
      // Use a fixed IV and key for simplicity and React Native compatibility
      const fixedIv = 'AiPresentation2024'; // Must be 16 chars
      const iv = CryptoJS.enc.Utf8.parse(fixedIv);
      const key = CryptoJS.SHA256(ENCRYPTION_KEY);

      // Encrypt using AES with the key and fixed IV
      const encrypted = CryptoJS.AES.encrypt(email, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      const result = encrypted.toString();

      // Check for consistency across calls
      if (encryptionCache[email] && encryptionCache[email] !== result) {
        console.error('ENCRYPTION INCONSISTENCY DETECTED!');
        console.error('Previous:', encryptionCache[email]);
        console.error('Current:', result);
      } else {
        encryptionCache[email] = result;
      }

      return result;
      */
  } catch (error) {
    console.error('Error encrypting email:', error);
    // Fallback: return a hash of the email if encryption fails
    return hashEmail(email);
  }
};

export const decryptEmail = (encryptedData: string): string => {
  try {
    // Use the same fixed IV and key for decryption
    const fixedIv = 'AiPresentation2024'; // Must be 16 chars
    const iv = CryptoJS.enc.Utf8.parse(fixedIv);
    const key = CryptoJS.SHA256(ENCRYPTION_KEY);

    // Decrypt using the same fixed IV
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Failed to decrypt email:', error);
    return '';
  }
};

// Function to call the cloud function for user deletion
export const callDeleteUserDataFunction = async (
  email: string,
  tokens: number,
  uid: string,
) => {
  try {
    // Get the Firebase ID token for authentication
    const idToken = await auth().currentUser?.getIdToken();
    if (!idToken) {
      throw new Error('User not authenticated. Please sign in again.');
    }

    // Log the hashed email on client side for comparison with server
    const clientHashedEmail = hashEmail(email);
    console.log('Client-side hashed email:', clientHashedEmail);

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(__DEV__ ? ENV.dev.deleteAccount : ENV.prod.deleteAccount, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        email,
        tokens,
        uid,
        // Send the client-hashed email for debugging
        clientEncryptedEmail: clientHashedEmail,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      
      // Log authentication errors specifically
      if (response.status === 401) {
        console.error('Authentication error (401): Missing or invalid authorization header');
      } else if (response.status === 403) {
        console.error('Authorization error (403): Invalid or expired token');
      }
      
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    console.log('Cloud function response:', data);

    // Check if server hash matches client hash
    if (data.serverHashedEmail) {
      console.log('Server-side hashed email:', data.serverHashedEmail);
      console.log('Hash match:', clientHashedEmail === data.serverHashedEmail);
    }

    return data;
  } catch (error) {
    console.error('Error calling deleteUserData function:', error);
    throw error;
  }
};

// Helper functions for hash collection management
export const storeUserInHashCollection = async (
  email: string,
  tokens: number,
) => {
  if (!email || email.trim() === '') {
    console.log('No email provided for hash collection storage');
    return;
  }

  try {
    console.log(
      `Storing user ${email} with ${tokens} tokens in hash collection`,
    );
    const hashedEmail = hashEmail(email);
    console.log(`Hashed email key: ${hashedEmail}`);

    await firestore().collection('hash').doc(hashedEmail).set({
      tokens,
      email: email, // Store original email for debugging
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    console.log('Document set operation completed');

    // Verify document was created
    const checkDoc: any = await firestore()
      .collection('hash')
      .doc(hashedEmail)
      .get();
    console.log('Verification - Document exists:', checkDoc.exists);
    if (checkDoc.exists) {
      console.log('Verification - Document data:', checkDoc.data());
    } else {
      console.error('Failed to create document in hash collection!');
    }

    console.log('Successfully stored user in hash collection');
  } catch (error) {
    console.error('Error storing user in hash collection:', error);
  }
};

export const getUserFromHashCollection = async (email: string) => {
  if (!email || email.trim() === '') {
    console.log('No email provided for hash collection lookup');
    return null;
  }

  try {
    const hashedEmail = hashEmail(email);
    console.log('hashedEmail', hashedEmail);
    console.log('Looking up hash collection with key:', hashedEmail);

    // Debug: List all documents in the hash collection
    console.log('Checking all documents in hash collection...');
    const hashSnapshot = await firestore().collection('hash').get();
    console.log(
      `Found ${hashSnapshot.docs.length} documents in hash collection`,
    );

    if (hashSnapshot.docs.length > 0) {
      console.log('Hash collection document IDs:');
      hashSnapshot.docs.forEach(doc => {
        console.log(`- ${doc.id}`);
      });
    }

    // Now try to get the specific document
    const hashDoc: any = await firestore()
      .collection('hash')
      .doc(hashedEmail)
      .get();

    console.log('Document exists:', hashDoc.exists);

    return hashDoc.exists ? hashDoc.data() : null;
  } catch (error) {
    console.error('Error getting user from hash collection:', error);
    return null;
  }
};

export const removeUserFromHashCollection = async (email: string) => {
  if (!email || email.trim() === '') {
    console.log('No email provided for hash collection removal');
    return;
  }

  try {
    console.log(`Attempting to remove ${email} from hash collection`);
    const hashedEmail = hashEmail(email);
    console.log(`Hashed email key: ${hashedEmail}`);

    // First check if the document exists
    const hashDoc: any = await firestore()
      .collection('hash')
      .doc(hashedEmail)
      .get();

    if (hashDoc.exists) {
      console.log('Found user in hash collection, deleting...');
      await firestore().collection('hash').doc(hashedEmail).delete();
      console.log('Successfully removed user from hash collection');
    } else {
      console.log('User not found in hash collection, nothing to remove');
    }
  } catch (error) {
    console.error('Error removing user from hash collection:', error);
  }
};
