/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');

const admin = require('firebase-admin');
const crypto = require('crypto');
const cors = require('cors');

admin.initializeApp();

// Initialize CORS middleware - allow all origins
const corsHandler = cors({origin: true});

// Secret key for encryption - in production, use environment variables
const ENCRYPTION_KEY = 'AiPresentation-SecureKey-2024';

// Authentication middleware to verify Firebase ID tokens
const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer (.*)$/);
  
  if (!match) {
    logger.error('Authentication error (401): Missing Authorization header', {
      headers: req.headers,
      method: req.method,
      url: req.url
    });
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(match[1]);
    req.user = decodedToken;
    logger.info('Authentication successful', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      method: req.method,
      url: req.url
    });
    next();
  } catch (err) {
    logger.error('Authorization error (403): Invalid or expired token', {
      error: err.message,
      method: req.method,
      url: req.url,
      tokenLength: match[1] ? match[1].length : 0
    });
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Simple hash function for document IDs
const hashEmail = email => {
  return crypto
    .createHash('sha256')
    .update(email + ENCRYPTION_KEY)
    .digest('hex');
};

exports.deleteAccount = onRequest(async (request, response) => {
  return corsHandler(request, response, async () => {
    // Apply authentication middleware
    await verifyAuth(request, response, async () => {
      try {
        logger.info('Delete User Data API called', {structuredData: true});

        // Check if request method is POST
        if (request.method !== 'POST') {
          return response.status(405).json({error: 'Method not allowed'});
        }

        // Get email and tokens from request body
        const {email, tokens = 0, uid, clientEncryptedEmail} = request.body;

        if (!email) {
          return response.status(400).json({error: 'Email is required'});
        }

        // Verify that the authenticated user is requesting deletion for their own account
        if (request.user.email !== email) {
          logger.error('Authorization error: User trying to delete different account', {
            authenticatedEmail: request.user.email,
            requestedEmail: email,
            uid: request.user.uid
          });
          return response.status(403).json({error: 'Unauthorized: Can only delete your own account'});
        }

        logger.info(`Processing data for email: ${email}`);

        // Hash email for document ID
        const hashedEmail = hashEmail(email);
        logger.info('Server hashed email:', hashedEmail);

        // Log client vs server hash for debugging
        if (clientEncryptedEmail) {
          logger.info('Client hashed email:', clientEncryptedEmail);
          logger.info('Hash match:', hashedEmail === clientEncryptedEmail);
        }

        // Store user tokens in hash collection using hashed email
        await admin.firestore().collection('hash').doc(hashedEmail).set({
          tokens,
          email: email, // Store original email for debugging
          createdAt: new Date(),
        });

        // Verify document was created
        const checkDoc = await admin
          .firestore()
          .collection('hash')
          .doc(hashedEmail)
          .get();
        logger.info('Document created:', checkDoc.exists);

        // If UID provided, delete user data from users collection
        if (uid) {
          await admin.firestore().collection('users').doc(uid).delete();
        }

        logger.info(`User data for ${email} moved to hash collection`);

        response.status(200).json({
          success: true,
          message: 'User data successfully processed',
          serverHashedEmail: hashedEmail,
        });
      } catch (error) {
        logger.error('Error deleting user data:', error);
        response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
  });
});







exports.addTokens = onRequest(async (request, response) => {
  return corsHandler(request, response, async () => {
    // Apply authentication middleware
    await verifyAuth(request, response, async () => {
      if (request.method !== 'POST') {
        return response.status(405).json({error: 'Method not allowed'});
      }

      const {userId, tokens} = request.body;

      if (!userId || !tokens) {
        return response.status(400).json({error: 'Missing userId or tokens'});
      }

      // Verify that the authenticated user is requesting tokens for themselves
      if (request.user.uid !== userId) {
        logger.error('Authorization error: User trying to add tokens for different user', {
          authenticatedUid: request.user.uid,
          requestedUserId: userId,
          email: request.user.email
        });
        return response.status(403).json({error: 'Unauthorized: Can only add tokens for your own account'});
      }

      try {
        const userRef = admin.firestore().collection('users').doc(userId);
        await admin.firestore().runTransaction(async transaction => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists) {
            throw new Error('User not found');
          }
          const currentTokens = userDoc.data().tokens.premiumToken || 0;
          transaction.update(userRef, {
            'tokens.premiumToken': currentTokens + tokens,
          });
        });

        logger.info('Tokens added successfully', {
          uid: userId,
          tokensAdded: tokens,
          email: request.user.email
        });

        response.status(200).json({success: true, message: 'Tokens added'});
      } catch (error) {
        logger.error('Error adding tokens:', error);
        response.status(500).json({success: false, error: error.message});
      }
    });
  });
});
