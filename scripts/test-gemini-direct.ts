// Test script to call Gemini API directly (bypassing SDK)
// This will help diagnose if the issue is with the SDK or the API itself

import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("GOOGLE_GEMINI_API_KEY is missing in .env");
    process.exit(1);
}

async function testGeminiAPI() {
    console.log("Testing Gemini API directly...");
    console.log("API Key (first 10 chars):", API_KEY?.substring(0, 10) + "...");

    // Try different API versions and model combinations
    const tests = [
        { version: "v1beta", model: "gemini-1.5-flash" },
        { version: "v1beta", model: "gemini-1.5-pro" },
        { version: "v1beta", model: "gemini-pro" },
        { version: "v1", model: "gemini-1.5-flash" },
        { version: "v1", model: "gemini-1.5-pro" },
        { version: "v1", model: "gemini-pro" },
    ];

    for (const test of tests) {
        const url = `https://generativelanguage.googleapis.com/${test.version}/models/${test.model}:generateContent?key=${API_KEY}`;

        console.log(`\nTesting ${test.version}/${test.model}...`);

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: "Say hello"
                        }]
                    }]
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ SUCCESS: ${test.version}/${test.model}`);
                console.log(`   Response preview: ${JSON.stringify(data).substring(0, 100)}...`);
            } else {
                const error = await response.text();
                console.log(`❌ FAILED: ${test.version}/${test.model} - Status: ${response.status}`);
                console.log(`   Error: ${error.substring(0, 200)}`);
            }
        } catch (err: any) {
            console.log(`❌ ERROR: ${test.version}/${test.model} - ${err.message}`);
        }
    }

    // Also list available models
    console.log("\n\n=== Listing Available Models ===");
    try {
        const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`;
        const listResponse = await fetch(listUrl);
        if (listResponse.ok) {
            const models = await listResponse.json();
            console.log("Available models:");
            models.models?.forEach((m: any) => {
                if (m.supportedGenerationMethods?.includes("generateContent")) {
                    console.log(`  - ${m.name} (supports: ${m.supportedGenerationMethods.join(", ")})`);
                }
            });
        } else {
            console.log("Failed to list models:", await listResponse.text());
        }
    } catch (err: any) {
        console.log("Error listing models:", err.message);
    }
}

testGeminiAPI();
