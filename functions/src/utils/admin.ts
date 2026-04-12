import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { SECRET_NAMES } from "./secrets";

const initializeAdmin = (): void => {
  if (admin.apps.length > 0) {
    return;
  }

  const serviceAccountJson = process.env[SECRET_NAMES.GCP_SERVICE_ACCOUNT_JSON];

  if (!serviceAccountJson) {
    admin.initializeApp();
    return;
  }

  try {
    const parsed = JSON.parse(serviceAccountJson);

    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error("Service account JSON is missing required fields");
    }

    // Convert to format expected by Firebase Admin SDK
    const serviceAccount = {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    logger.error(
      "Failed to initialize Firebase Admin from service-account secret",
      error,
    );
    throw new Error(
      `Invalid ${SECRET_NAMES.GCP_SERVICE_ACCOUNT_JSON} value. Rotate and set a valid JSON service account secret.`,
    );
  }
};

initializeAdmin();

export { admin };
