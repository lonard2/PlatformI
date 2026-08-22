/**
 * PlatformI - Multi-Model AI Transit Assistant API Route
 *
 * Handles client chat queries, applies multi-model routing via OpenRouter,
 * and falls back to local transit graph reasoning when offline.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

import { NextRequest, NextResponse } from "next/server";
import { queryTransitAdvisor, AIChatMessage, DEFAULT_AI_MODEL_ID, SUPPORTED_AI_MODELS } from "@/lib/services/aiTransitService";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      messages?: AIChatMessage[];
      model?: string;
      apiKey?: string;
    };

    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request: 'messages' array must contain at least one message.",
        },
        { status: 400 }
      );
    }

    const requestedModel = body.model || DEFAULT_AI_MODEL_ID;
    const isModelValid = SUPPORTED_AI_MODELS.some((m) => m.id === requestedModel);
    const modelToUse = isModelValid ? requestedModel : DEFAULT_AI_MODEL_ID;

    const response = await queryTransitAdvisor(body.messages, modelToUse, body.apiKey);

    return NextResponse.json(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /api/ai/assistant] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error in AI Assistant Route",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      service: "PlatformI Multi-Model AI Transit Advisor",
      supportedModels: SUPPORTED_AI_MODELS,
      defaultModel: DEFAULT_AI_MODEL_ID,
    },
    { status: 200 }
  );
}
