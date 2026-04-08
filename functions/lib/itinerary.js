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
exports.generateItinerary = void 0;
const functions = __importStar(require("firebase-functions"));
const generative_ai_1 = require("@google/generative-ai");
const zod_1 = require("zod");
const admin_1 = require("./utils/admin");
const secrets_1 = require("./utils/secrets");
const itineraryRuntime = functions.runWith({ secrets: [secrets_1.SECRET_NAMES.GEMINI_API_KEY] });
let geminiClient = null;
const getGeminiClient = () => {
    if (!geminiClient) {
        geminiClient = new generative_ai_1.GoogleGenerativeAI((0, secrets_1.getRequiredEnv)(secrets_1.SECRET_NAMES.GEMINI_API_KEY));
    }
    return geminiClient;
};
const ActivitySchema = zod_1.z.object({
    id: zod_1.z.string(),
    time: zod_1.z.string(),
    title: zod_1.z.string(),
    type: zod_1.z.string(),
    durationMinutes: zod_1.z.number().int().positive(),
    estimatedCost: zod_1.z.number().int().nonnegative(),
    island: zod_1.z.string(),
    isBookable: zod_1.z.boolean(),
    operatorId: zod_1.z.string().nullable(),
    notes: zod_1.z.string()
});
const DaySchema = zod_1.z.object({
    dayNumber: zod_1.z.number().int().positive(),
    date: zod_1.z.string(),
    island: zod_1.z.string(),
    activities: zod_1.z.array(ActivitySchema).min(3).max(5)
});
const ItinerarySchema = zod_1.z.object({
    tripVersion: zod_1.z.literal(1),
    currency: zod_1.z.literal("INR"),
    days: zod_1.z.array(DaySchema).min(1),
    totalEstimatedCost: zod_1.z.number().int().nonnegative()
});
exports.generateItinerary = itineraryRuntime.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { startDate, endDate, adults = 2, children = 0, budget = 50000, persona = 'Balanced', interests = 'General', preferredPace = 'Moderate', hotelCategory = '3 Star', specialNotes = '' } = data;
    if (!startDate || !endDate) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing startDate or endDate');
    }
    const prompt = `You are the itinerary engine for AndamanBazaar.in, an Andaman-focused travel platform.

Your job is to generate a structured, day-by-day Andaman trip itinerary in VALID JSON ONLY.
Do not write markdown.
Do not write explanations.
Do not wrap the JSON in code fences.
Return exactly one JSON object.

## Context
The itinerary is for an Andaman trip planner that supports day-by-day trip planning, ferry transfers between islands, estimated trip costing, activity-level booking buttons.

## User Input
- startDate: ${startDate}
- endDate: ${endDate}
- adults: ${adults}
- children: ${children}
- budget: ${budget}
- persona: ${persona}
- interests: ${interests}
- preferredPace: ${preferredPace}
- hotelCategory: ${hotelCategory}
- specialNotes: ${specialNotes}

## Hard Rules
1. Return VALID JSON only.
2. Use this exact top-level shape:
{
  "tripVersion": 1,
  "currency": "INR",
  "days": [...],
  "totalEstimatedCost": number
}
3. \`days\` must be an array with one object per travel day.
4. Each day object must contain: dayNumber, date, island, activities
5. Each activity object must contain exactly: id, time, title, type, durationMinutes, estimatedCost, island, isBookable, operatorId, notes
6. Use ISO date format: YYYY-MM-DD.
7. Generate realistic Andaman plans only.
8. Include ferry or transfer activities where island changes happen.
9. Keep totalEstimatedCost within the given budget unless impossible.
10. If budget is tight, prefer lower-cost experiences and fewer premium activities.
11. Do not leave placeholders like {{$nextDate1}} or {{something}} in output.
12. Generate actual dates between startDate and endDate.
13. Every day must have 3 to 5 activities.
14. Use realistic islands such as: Port Blair, Havelock (Swaraj Dweep), Neil Island (Shaheed Dweep), Baratang, Ross Island, North Bay.
15. Use realistic activity types such as: Transfer, Beaches, History & Culture, Scuba Diving, Snorkelling, Local Food, Photography, Leisure, Wildlife, Kayaking.
16. \`estimatedCost\` must be an integer in INR.
17. \`isBookable\` should be true only when the activity could reasonably map to a future operator booking.
18. Use \`operatorId: null\` unless a real mapped operator exists.
19. \`notes\` must be practical and concise, not promotional.
20. Avoid duplicate activities across days unless travel logic requires it.

## Planning Logic
- Cost Logic: The sum of all activity estimatedCost values should closely match totalEstimatedCost.

Return only the JSON object.`;
    try {
        const model = getGeminiClient().getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Parse model output as JSON
        let parsedData;
        try {
            parsedData = JSON.parse(text);
        }
        catch (e) {
            console.error("JSON parsing error:", e, text);
            throw new functions.https.HttpsError('internal', 'AI returned invalid JSON');
        }
        // Validate with Zod
        const validationResult = ItinerarySchema.safeParse(parsedData);
        if (!validationResult.success) {
            console.error("Zod validation error:", validationResult.error);
            throw new functions.https.HttpsError('internal', 'AI returned output with missing or invalid keys');
        }
        const validatedData = validationResult.data;
        // Check if any date is invalid
        for (const day of validatedData.days) {
            if (isNaN(new Date(day.date).getTime())) {
                throw new functions.https.HttpsError('internal', `AI returned invalid date: ${day.date}`);
            }
        }
        // Recompute totalEstimatedCost server-side and Regenerate IDs
        let computedTotalCost = 0;
        validatedData.days.forEach(day => {
            day.activities.forEach((activity, index) => {
                computedTotalCost += activity.estimatedCost;
                // Regenerate ID to ensure no duplicates
                activity.id = `act_${day.dayNumber}_${index}_${Math.random().toString(36).substring(2, 7)}`;
            });
        });
        validatedData.totalEstimatedCost = computedTotalCost;
        // Save only the cleaned object to Firestore
        const itineraryRef = await admin_1.admin.firestore().collection('itineraries').add({
            ...validatedData,
            userId: context.auth.uid,
            status: 'draft',
            createdAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin_1.admin.firestore.FieldValue.serverTimestamp()
        });
        return {
            success: true,
            itineraryId: itineraryRef.id,
            itinerary: validatedData
        };
    }
    catch (error) {
        console.error('Error generating itinerary:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Itinerary generation failed');
    }
});
//# sourceMappingURL=itinerary.js.map