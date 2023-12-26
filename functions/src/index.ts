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

type UserData = {
  api_key: string;
  enable_alert_notifications: boolean;
  device_tokens: string[];
};

export const customAlertNotificationWebhook = onRequest(
  { timeoutSeconds: 1200, region: ["us-central1"] },
  async (req, res) => {
    if (req.method != "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const apiKey = req.query.apiKey;
    if (!apiKey) {
      logger.error("No api key provided");
      res.status(400).send("No api key provided");
      return;
    }

    const title = req.body.title;
    const body = req.body.body;

    if (!title || !body) {
      logger.error("No title or body provided");
      res.status(400).send("No title or body provided");
      return;
    }

    const user = await admin
      .firestore()
      .collection("users")
      .where("api_key", "==", apiKey)
      .get();

    if (user.empty) {
      logger.error(`No user found with api key ${apiKey}`);
      res.status(401).send("Unauthorized");
      return;
    }

    const userData: UserData = user.docs[0].data() as UserData;

    if (!userData.enable_alert_notifications) {
      logger.error(
        `User with api key ${apiKey} has disabled alert notifications`
      );
      res.status(400).send("Alert notifications disabled");
      return;
    }

    const deviceTokens = userData.device_tokens;
    if (!deviceTokens?.length) {
      logger.error(`No device tokens found for user with api key ${apiKey}`);
      res.status(400).send("No device tokens found");
      return;
    }

    logger.info(`Sending notification to ${deviceTokens.length} devices`);
    for (const token of deviceTokens) {
      logger.info(`Sending notification to ${token}`);
      try {
        await admin.messaging().send({
          token,
          notification: {
            title,
            body,
          },
        });
      } catch (error) {
        logger.error(`Error sending notification to ${token}`, error);
        if (
          (error as { code: string }).code ===
          "messaging/registration-token-not-registered"
        ) {
          logger.info(`Removing invalid token ${token}`);
          await admin
            .firestore()
            .collection("users")
            .doc(user.docs[0].id)
            .update({
              device_tokens: admin.firestore.FieldValue.arrayRemove(token),
            });
        }
      }
    }

    res.status(200).send({ success: true });
  }
);
