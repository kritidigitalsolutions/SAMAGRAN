import { firebaseAdmin, isFirebaseMessagingReady } from "../config/firebase.js";

const MAX_FCM_TOKENS_PER_BATCH = 500;

const isValidToken = (token) => typeof token === "string" && token.trim().length >= 20;

const normalizeDataValue = (value) => {
    if (value === undefined || value === null) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    return JSON.stringify(value);
};

const normalizeData = (data = {}) => {
    return Object.fromEntries(
        Object.entries(data || {}).map(([key, value]) => [key, normalizeDataValue(value)])
    );
};

const chunkArray = (items = [], size = MAX_FCM_TOKENS_PER_BATCH) => {
    const chunks = [];

    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }

    return chunks;
};

export const sendPushNotification = async ({ token, title, body, data = {} }) => {
    if (!isFirebaseMessagingReady) {
        return { status: "SKIPPED", message: "Firebase messaging is not configured" };
    }

    if (!isValidToken(token)) {
        return { status: "SKIPPED", message: "No valid FCM token" };
    }

    const message = {
        token: String(token).trim(),
        notification: {
            title: String(title || "").trim(),
            body: String(body || "").trim(),
        },
        data: normalizeData(data),
    };

    try {
        const response = await firebaseAdmin.messaging().send(message);
        return { status: "SENT", messageId: response, error: null };
    } catch (error) {
        return { status: "FAILED", messageId: null, error: error.message };
    }
};

export const sendPushNotifications = async ({ tokens = [], title, body, data = {} }) => {
    if (!isFirebaseMessagingReady) {
        return {
            status: "SKIPPED",
            message: "Firebase messaging is not configured",
            sentCount: 0,
            failedCount: 0,
            responses: [],
        };
    }

    const validTokens = Array.from(new Set(tokens.filter(isValidToken).map((token) => String(token).trim())));

    if (!validTokens.length) {
        return {
            status: "SKIPPED",
            message: "No valid FCM tokens",
            sentCount: 0,
            failedCount: 0,
            responses: [],
        };
    }

    const normalizedData = normalizeData(data);
    const batches = chunkArray(validTokens);
    const responses = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const batch of batches) {
        const result = await firebaseAdmin.messaging().sendEachForMulticast({
            tokens: batch,
            notification: {
                title: String(title || "").trim(),
                body: String(body || "").trim(),
            },
            data: normalizedData,
        });

        sentCount += result.successCount;
        failedCount += result.failureCount;
        responses.push(result);
    }

    return {
        status: failedCount > 0 ? "PARTIAL" : "SENT",
        sentCount,
        failedCount,
        responses,
    };
};

export const isFcmTokenValid = isValidToken;
