import { GoogleGenAI, MediaResolution, ThinkingLevel, FinishReason } from "@google/genai";

/**
 * Model choice. The first pass uses the cheap model; a document whose result
 * fails the deterministic checks is read again by the stronger model.
 * Both can be overridden per deployment without a code change.
 */
export const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const escalationSetting = process.env.GEMINI_ESCALATION_MODEL;
export const ESCALATION_MODEL =
    escalationSetting === undefined ? "gemini-3.8-flash"
        : escalationSetting.trim() === "" || escalationSetting === "none" ? null
            : escalationSetting.trim();

export const SUPPORTED_MIME_TYPES = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
]);

// Inline requests are capped at 20 MB in total, base64 inflates by a third
export const MAX_UPLOAD_BYTES = 14 * 1024 * 1024;

export function isAiConfigured() {
    return Boolean(process.env.GOOGLE_GEMINI_API_KEY);
}

let client: GoogleGenAI | null = null;
function getClient() {
    if (!client) client = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });
    return client;
}

export interface ReadPass {
    model: string;
    /** Stronger passes reason more and look at the page in more detail. */
    strong: boolean;
}

export function firstPass(): ReadPass {
    return { model: PRIMARY_MODEL, strong: false };
}

export function escalationPass(): ReadPass | null {
    if (!ESCALATION_MODEL) return null;
    return { model: ESCALATION_MODEL, strong: true };
}

interface StructuredRequest {
    task: string;
    pass: ReadPass;
    systemInstruction: string;
    instruction: string;
    file: { base64: string; mimeType: string };
    schema: object;
}

/**
 * Reads one document and returns JSON that matches `schema`. Output shape is
 * enforced by the API (responseJsonSchema), so there is no fence stripping or
 * guessing at where the JSON starts. Sampling settings are left at the model
 * defaults, as Google recommends for Gemini 3.x; consistency comes from the
 * schema, the prompt rules and the checks run on the result.
 */
export async function readDocument<T>({ task, pass, systemInstruction, instruction, file, schema }: StructuredRequest): Promise<T> {
    const response = await getClient().models.generateContent({
        model: pass.model,
        contents: [{
            role: "user",
            parts: [
                { inlineData: { data: file.base64, mimeType: file.mimeType } },
                { text: instruction },
            ],
        }],
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseJsonSchema: schema,
            thinkingConfig: { thinkingLevel: pass.strong ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW },
            mediaResolution: pass.strong ? MediaResolution.MEDIA_RESOLUTION_HIGH : MediaResolution.MEDIA_RESOLUTION_MEDIUM,
            maxOutputTokens: 16384,
        },
    });

    const usage = response.usageMetadata;
    console.info(
        `[ai] ${task} model=${pass.model} input=${usage?.promptTokenCount ?? "?"} ` +
        `output=${usage?.candidatesTokenCount ?? "?"} thinking=${usage?.thoughtsTokenCount ?? 0}`
    );

    const finish = response.candidates?.[0]?.finishReason;
    if (finish && finish !== FinishReason.STOP) {
        throw new Error(`${task}: generation stopped early (${finish})`);
    }
    const text = response.text;
    if (!text) throw new Error(`${task}: empty response`);
    return JSON.parse(text) as T;
}

/** JSON Schema helper: a value that may be missing on the document. */
export function nullable(schema: Record<string, unknown>) {
    return { anyOf: [schema, { type: "null" }] };
}
