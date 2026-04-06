"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWeeklyTrendingEmails = exports.sendEmailInternal = exports.sendEmail = void 0;
const functions = __importStar(require("firebase-functions"));
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
// ===== EMAIL CLOUD FUNCTION =====
// All email provider API keys stay server-side only (per AGENTS.md)
// Secret stored in Firebase Secret Manager — never in codebase
const emailApiKey = (0, params_1.defineSecret)('EMAIL_API_KEY');
// Non-secret config constants
const EMAIL_PROVIDER = 'resend';
const EMAIL_FROM_ADDRESS = 'noreply@andamanbazaar.in';
const EMAIL_FROM_NAME = 'Andaman Bazaar';
const getEmailConfig = () => {
    const apiKey = emailApiKey.value();
    if (!apiKey) {
        throw new Error('EMAIL_API_KEY secret not set. Run: firebase functions:secrets:set EMAIL_API_KEY');
    }
    return {
        provider: EMAIL_PROVIDER,
        apiKey,
        fromEmail: EMAIL_FROM_ADDRESS,
        fromName: EMAIL_FROM_NAME,
    };
};
const sendViaResend = async (config, message) => {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: `${message.fromName || config.fromName} <${config.fromEmail}>`,
            to: [message.to],
            subject: message.subject,
            html: message.html,
        }),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Resend error: ${error}`);
    }
    const result = await response.json();
    console.log('Email sent via Resend, id:', result.id);
};
const sendViaSendGrid = async (config, message) => {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            personalizations: [{ to: [{ email: message.to }] }],
            from: { email: config.fromEmail, name: message.fromName || config.fromName },
            subject: message.subject,
            content: [{ type: 'text/html', value: message.html }],
        }),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`SendGrid error: ${error}`);
    }
    console.log('Email sent via SendGrid');
};
// Validate that the user is authenticated
const verifyAuth = async (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Unauthorized: missing auth token');
    }
    const token = authHeader.split('Bearer ')[1];
    return await admin.auth().verifyIdToken(token);
};
// ===== EXPORTED CLOUD FUNCTIONS =====
exports.sendEmail = functions.runWith({ secrets: ['EMAIL_API_KEY'] }).https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        // Verify caller is authenticated
        const decodedToken = await verifyAuth(req);
        console.log('sendEmail called by uid:', decodedToken.uid);
        const { to, subject, html, fromName } = req.body;
        if (!to || !subject || !html) {
            res.status(400).json({ error: 'Missing required fields: to, subject, html' });
            return;
        }
        const emailConfig = getEmailConfig();
        const message = { to, subject, html, fromName };
        if (emailConfig.provider === 'sendgrid') {
            await sendViaSendGrid(emailConfig, message);
        }
        else {
            await sendViaResend(emailConfig, message);
        }
        // Log email sent in Firestore for audit trail
        await admin.firestore().collection('emailLogs').add({
            to,
            subject,
            sentBy: decodedToken.uid,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            provider: emailConfig.provider,
        });
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('sendEmail error:', error);
        if (error.message?.includes('Unauthorized')) {
            res.status(401).json({ error: 'Unauthorized' });
        }
        else {
            res.status(500).json({ error: 'Failed to send email' });
        }
    }
});
// Internal email sender for use by other Cloud Functions (no auth check needed)
const sendEmailInternal = async (to, subject, html) => {
    try {
        const emailConfig = getEmailConfig();
        const message = { to, subject, html };
        if (emailConfig.provider === 'sendgrid') {
            await sendViaSendGrid(emailConfig, message);
        }
        else {
            await sendViaResend(emailConfig, message);
        }
        return true;
    }
    catch (error) {
        console.error('sendEmailInternal error:', error);
        return false;
    }
};
exports.sendEmailInternal = sendEmailInternal;
// Scheduled: Weekly trending listings email
exports.sendWeeklyTrendingEmails = functions.runWith({ secrets: ['EMAIL_API_KEY'] }).pubsub
    .schedule('every monday 09:00')
    .timeZone('Asia/Kolkata')
    .onRun(async () => {
    try {
        console.log('Sending weekly trending emails...');
        const db = admin.firestore();
        // Get top 3 trending listings from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const trendingSnap = await db.collection('listings')
            .where('status', '==', 'active')
            .orderBy('viewCount', 'desc')
            .limit(3)
            .get();
        const trendItems = trendingSnap.docs.map(d => d.data().title || 'Untitled listing');
        // Get all users with email subscriptions enabled
        const usersSnap = await db.collection('users')
            .where('emailNotifications.weeklyTrending', '==', true)
            .limit(500)
            .get();
        const emailConfig = getEmailConfig();
        let sent = 0;
        for (const userDoc of usersSnap.docs) {
            const user = userDoc.data();
            if (!user.email)
                continue;
            const { emailTemplates: tmpl } = await Promise.resolve().then(() => __importStar(require('./emailTemplatesNode')));
            const template = tmpl.weeklyTrending({
                TREND_ITEM_1: trendItems[0] || 'No listings yet',
                TREND_ITEM_2: trendItems[1] || '',
                TREND_ITEM_3: trendItems[2] || '',
            });
            await sendViaResend(emailConfig, {
                to: user.email,
                subject: template.subject,
                html: template.htmlContent,
            });
            sent++;
            // Rate limit
            await new Promise(r => setTimeout(r, 150));
        }
        console.log(`Weekly trending emails sent to ${sent} users`);
    }
    catch (error) {
        console.error('Weekly trending email error:', error);
    }
});
//# sourceMappingURL=email.js.map