// 🌴 Andaman Bazaar Email Service
// All email API keys stay in Cloud Functions only — never exposed to frontend (AGENTS.md rule)

import { auth } from "./firebase";
import {
  emailTemplates,
  emailTriggers,
  getEmailTemplate,
  renderEmailContent,
  EmailData,
} from "./emailTemplates";

export type { EmailData };

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

// Get Firebase auth token for Cloud Function calls
const getAuthToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  return await user.getIdToken();
};

// Call the Cloud Function to send an email (keeps API key server-side)
export const sendEmail = async (message: EmailMessage): Promise<boolean> => {
  try {
    const fnUrl = import.meta.env.VITE_FIREBASE_SEND_EMAIL_FUNCTION;
    if (!fnUrl) {
      console.error("VITE_FIREBASE_SEND_EMAIL_FUNCTION not configured");
      return false;
    }

    const token = await getAuthToken();
    const response = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error("Email Cloud Function error:", response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("sendEmail error:", error);
    return false;
  }
};

// Send a named template email
export const sendTemplateEmail = async (
  templateName: keyof typeof emailTemplates,
  to: string,
  data: EmailData = {},
): Promise<boolean> => {
  try {
    const template = getEmailTemplate(templateName, data);
    const html = renderEmailContent(template, data);
    return await sendEmail({ to, subject: template.subject, html });
  } catch (error) {
    console.error("sendTemplateEmail error:", error);
    return false;
  }
};

// Send email via trigger event name
export const triggerEmail = async (
  trigger: keyof typeof emailTriggers,
  to: string,
  data: EmailData = {},
): Promise<boolean> => {
  try {
    const templateName = emailTriggers[trigger] as keyof typeof emailTemplates;
    if (!templateName) {
      console.error(`Email trigger "${trigger}" not found`);
      return false;
    }
    return await sendTemplateEmail(templateName, to, data);
  } catch (error) {
    console.error("triggerEmail error:", error);
    return false;
  }
};
