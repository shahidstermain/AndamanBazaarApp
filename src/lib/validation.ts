import { z } from 'zod';
import DOMPurify from 'dompurify';

// ===== SANITIZATION UTILITIES =====
const sanitizeHtmlFallback = (input: string): string =>
    input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/<(?!\/?(?:b|i|em|strong|br|p)(?:\s|>|\/))(?:[^>]*)>/gi, '');

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export const sanitizeHtml = (input: string): string => {
    if (typeof input !== 'string') {
        throw new TypeError('sanitizeHtml: input must be a string');
    }
    // Use DOMPurify only in a real browser with a working document.createElement
    if (typeof window !== 'undefined' && typeof window.document?.createElement === 'function') {
        try {
            const result = DOMPurify.sanitize(input, {
                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
                ALLOWED_ATTR: [],
            });
            // DOMPurify may silently return '' in jsdom; fall through to regex if so
            if (result || !input) {
                if (!/<\/?(?:script|iframe)\b/i.test(result)) {
                    return result;
                }
            }
        } catch {
            // Fall through to regex approach if DOMPurify fails
        }
    }
    // Server-side or jsdom fallback: regex-based sanitization
    return sanitizeHtmlFallback(input);
};

/**
 * Sanitize plain text input (no HTML allowed)
 */
export const sanitizePlainText = (input: string): string => {
    return input
        .replace(/[<>\/\\"'`]/g, '') // Remove dangerous characters including backslash and forward slash
        .trim()
        .slice(0, 10000); // Prevent DoS via huge strings
};

/**
 * Detect potential prompt injection attempts in AI-facing inputs
 */
export const detectPromptInjection = (text: string): boolean => {
    const injectionPatterns = [
        /ignore\s+(previous|above|all)\s+(instructions|prompts)/i,
        /system\s*:\s*/i,
        /override\s+(settings|instructions)/i,
        /roleplay\s+as/i,
        /pretend\s+(you|to)\s+are/i,
        /disregard\s+(your|the)\s+rules/i,
    ];

    return injectionPatterns.some(pattern => pattern.test(text));
};

// ===== VALIDATION SCHEMAS =====

/**
 * Listing validation schema
 */
export const listingSchema = z.object({
    title: z
        .string()
        .min(5, 'Title must be at least 5 characters')
        .max(100, 'Title must not exceed 100 characters')
        .regex(/^[a-zA-Z0-9\s\-,.'()&₹]+$/, 'Title contains invalid characters'),

    description: z
        .string()
        .min(20, 'Description must be at least 20 characters')
        .max(2000, 'Description must not exceed 2000 characters')
        .refine(
            (val) => !detectPromptInjection(val),
            'Description contains suspicious content'
        ),

    price: z
        .number()
        .positive('Price must be positive')
        .max(10000000, 'Price exceeds maximum allowed value')
        .refine((val) => val >= 1, 'Price must be at least ₹1'),

    category_id: z.string().min(1, 'Category is required'),

    subcategory_id: z.string().optional(),

    condition: z.enum(['new', 'like_new', 'good', 'fair']),

    city: z.string().min(2, 'City is required').max(100),

    area: z.string().max(200).optional(),

    // New fields from Post-an-Ad redesign
    is_negotiable: z.boolean().default(true),

    min_price: z
        .number()
        .nonnegative('Minimum price cannot be negative')
        .max(10000000, 'Minimum price exceeds maximum')
        .optional()
        .nullable(),

    item_age: z.enum(['<1m', '1-6m', '6-12m', '1-2y', '2-5y', '5y+']).optional().nullable(),

    has_warranty: z.boolean().default(false),

    warranty_expiry: z.string().optional().nullable(),

    has_invoice: z.boolean().default(false),

    accessories: z.array(
        z.string().min(1, 'Accessory name cannot be empty').max(50, 'Accessory name too long')
    ).max(15, 'Maximum 15 accessories').default([]),

    contact_preferences: z.object({
        chat: z.boolean().default(true),
        phone: z.boolean().default(false),
        whatsapp: z.boolean().default(false),
    }).default({ chat: true, phone: false, whatsapp: false }),
}).refine(
    (data) => {
        if (data.is_negotiable && data.min_price !== undefined && data.min_price !== null) {
            return data.min_price < data.price;
        }
        return true;
    },
    { message: 'Minimum price must be less than the listing price', path: ['min_price'] }
);

export type ListingInput = z.infer<typeof listingSchema>;

/**
 * Message validation schema
 */
export const messageSchema = z.object({
    message_text: z
        .string()
        .min(1, 'Message cannot be empty')
        .max(2000, 'Message too long')
        .refine(
            (val) => !/<script/i.test(val),
            'Message contains invalid content'
        ),

    image_url: z.string().url().optional().or(z.literal('')),
});

export type MessageInput = z.infer<typeof messageSchema>;

/**
 * Profile update validation schema
 */
export const profileUpdateSchema = z.object({
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name too long')
        .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters')
        .optional(),

    phone_number: z
        .string()
        .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number')
        .optional(),

    city: z.string().max(100).optional(),

    area: z.string().max(200).optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/**
 * Search query validation
 */
export const searchQuerySchema = z.object({
    query: z
        .string()
        .max(200, 'Search query too long')
        .refine(
            (val) => !/['";\\]/.test(val),
            'Search query contains invalid characters'
        ),

    category: z.string().max(50).optional(),

    minPrice: z.number().nonnegative().optional(),

    maxPrice: z.number().positive().optional(),

    city: z.string().max(100).optional(),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

// ===== VALIDATION HELPERS =====

/**
 * Validate phone number format (Indian)
 */
export const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return false;
    let cleaned = phone.replace(/\D/g, '');

    // Auto-strip country codes if 11 or 12 digits
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        cleaned = cleaned.substring(2);
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }

    return /^[6-9]\d{9}$/.test(cleaned);
};

/**
 * Validate file upload
 */
export const validateFileUpload = (
    file: File,
    options: {
        maxSizeMB?: number;
        allowedTypes?: string[];
    } = {}
): { valid: boolean; error?: string } => {
    const { maxSizeMB = 5, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'] } = options;

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return { valid: false, error: `File size exceeds ${maxSizeMB}MB` };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Only images allowed.' };
    }

    // Check file name for suspicious patterns
    if (/\.(exe|sh|bat|cmd|ps1|php|asp|jsp)$/i.test(file.name)) {
        return { valid: false, error: 'Suspicious file name detected' };
    }

    return { valid: true };
};

/**
 * Sanitize URL to prevent javascript: and data: URIs
 */
export const sanitizeUrl = (url: string): string => {
    if (!url) return '';

    const cleaned = url.trim();

    // Block dangerous protocols
    if (/^(javascript|data|vbscript):/i.test(cleaned)) {
        return '';
    }

    // Only allow http(s) and relative URLs
    if (!/^(https?:\/\/|\/)/i.test(cleaned)) {
        return '';
    }

    return cleaned;
};

/**
 * Safe JSON parse with error handling
 */
export const safeJsonParse = <T>(json: string, fallback: T): T => {
    if (json === null || json === undefined || json === '') return fallback;
    try {
        const result = JSON.parse(json);
        // JSON.parse(null) returns null without throwing — treat as fallback unless string was exactly "null"
        if (result === null && json.trim() !== 'null') return fallback;
        return result as T;
    } catch {
        return fallback;
    }
};
