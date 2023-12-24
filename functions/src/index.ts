/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";
import { initializeApp } from "firebase-admin";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const createToken = onRequest(async (request, response) => {
  initializeApp();
  const userId = request.body.userId;
  logger.info("Creating token for", { userId });
  const token = await getAuth().createCustomToken(userId);
  response.send({ token });
});
