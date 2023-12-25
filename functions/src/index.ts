import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

export const createToken = onRequest(
  { timeoutSeconds: 1200, region: ["us-central1"] },
  async (req, res) => {
    if (req.method != "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const userId = req.body.userId;
    logger.info(`Creating token for ${userId}`);
    const token = await getAuth().createCustomToken(userId);
    res.status(200).send({ token });
  }
);
