/**
 * PlatformI - Milestone 5 Test Suite: Multi-Model AI Transit Advisor Service
 *
 * Tests:
 * 1. Support for 6 designated OpenRouter AI models
 * 2. Grounded system prompt construction with authentic Jakarta transit domain data
 * 3. Local graph reasoning fallback engine across multiple itinerary queries
 * 4. JakLingko 3-hour Rp 10k integrated tariff explanation grounding
 * 5. Prompt suggestions catalog
 * 6. Query dispatcher error recovery and response typing
 */

import { describe, it, expect } from "vitest";
import {
  SUPPORTED_AI_MODELS,
  DEFAULT_AI_MODEL_ID,
  PROMPT_SUGGESTIONS,
  buildTransitSystemPrompt,
  generateLocalGroundedResponse,
  queryTransitAdvisor,
} from "@/lib/services/aiTransitService";

describe("Milestone 5: Multi-Model AI Transit Advisor Service", () => {
  describe("1. Supported AI Models & Configurations", () => {
    it("supports exactly the 6 designated production AI models", () => {
      expect(SUPPORTED_AI_MODELS).toHaveLength(6);
      const modelIds = SUPPORTED_AI_MODELS.map((m) => m.id);

      expect(modelIds).toContain("google/gemini-3.7-flash");
      expect(modelIds).toContain("google/gemini-3.5-flash-lite");
      expect(modelIds).toContain("deepseek/deepseek-v4-pro-0813");
      expect(modelIds).toContain("qwen/qwen3.7-plus");
      expect(modelIds).toContain("openai/gpt-5.6-luna");
      expect(modelIds).toContain("google/gemma-4-26b-a4b-it");
    });

    it("designates google/gemini-3.7-flash as default model", () => {
      expect(DEFAULT_AI_MODEL_ID).toBe("google/gemini-3.7-flash");
      const defaultModel = SUPPORTED_AI_MODELS.find((m) => m.id === DEFAULT_AI_MODEL_ID);
      expect(defaultModel).toBeDefined();
      expect(defaultModel?.provider).toBe("Google");
    });

    it("provides complete metadata for every model without stubs", () => {
      for (const model of SUPPORTED_AI_MODELS) {
        expect(model.name).toBeTruthy();
        expect(model.provider).toBeTruthy();
        expect(model.tagline).toBeTruthy();
        expect(model.badgeColor).toBeTruthy();
        expect(model.contextWindow).toBeGreaterThan(50000);
        expect(model.recommendedFor).toBeTruthy();
      }
    });
  });

  describe("2. Transit Grounding System Prompt", () => {
    it("builds a comprehensive prompt containing all 4 transit dimensions", () => {
      const prompt = buildTransitSystemPrompt();
      expect(prompt).toContain("Land Rail");
      expect(prompt).toContain("Land Bus");
      expect(prompt).toContain("Aviation");
      expect(prompt).toContain("Maritime");
    });

    it("embeds major Jakarta multimodal interchange hubs", () => {
      const prompt = buildTransitSystemPrompt();
      expect(prompt).toContain("Dukuh Atas");
      expect(prompt).toContain("CSW");
      expect(prompt).toContain("ASEAN");
      expect(prompt).toContain("Manggarai");
      expect(prompt).toContain("Halim");
      expect(prompt).toContain("Soekarno-Hatta");
    });

    it("embeds authentic JakLingko 3-hour Rp 10,000 fare cap policy rules", () => {
      const prompt = buildTransitSystemPrompt();
      expect(prompt).toContain("10,000");
      expect(prompt).toContain("3 hours");
      expect(prompt).toContain("180 minutes");
      expect(prompt).toContain("Rp 3,500");
    });
  });

  describe("3. Local Grounded Rule & Graph Reasoning Engine", () => {
    it("reasons accurately about Whoosh Halim to Dukuh Atas transfers", () => {
      const query = "How do I get from Whoosh Halim station to MRT Dukuh Atas?";
      const res = generateLocalGroundedResponse(query, "google/gemini-3.7-flash");

      expect(res.content).toContain("Whoosh Halim");
      expect(res.content).toContain("LRT Jabodebek Bekasi Line");
      expect(res.content).toContain("Dukuh Atas");
      expect(res.fallbackUsed).toBe(true);
      expect(res.suggestedLines).toContain("line-whoosh-hsr");
      expect(res.suggestedLines).toContain("line-lrt-jb-bekasi");
    });

    it("reasons accurately about Lebak Bulus to Pantai Indah Kapuk (PIK)", () => {
      const query = "What is the best route from Lebak Bulus to PIK?";
      const res = generateLocalGroundedResponse(query, "deepseek/deepseek-v4-pro-0813");

      expect(res.content).toContain("Lebak Bulus");
      expect(res.content).toContain("Pantai Indah Kapuk");
      expect(res.content).toContain("Blok M");
      expect(res.content).toContain("TransJakarta");
      expect(res.suggestedLines).toContain("line-mrt-ns");
    });

    it("provides mathematical explanation of JakLingko 3-hour Rp 10k tariff cap", () => {
      const query = "Explain how the JakLingko 3-hour 10,000 fare cap works";
      const res = generateLocalGroundedResponse(query, "openai/gpt-5.6-luna");

      expect(res.content).toContain("10,000");
      expect(res.content).toContain("180-minute");
      expect(res.content).toContain("Rp 3,500");
      expect(res.content).toContain("45 minutes");
    });

    it("reasons accurately about Bekasi Barat to Soekarno-Hatta Airport (CGK)", () => {
      const query = "How to travel from Bekasi to Soekarno-Hatta Airport using trains?";
      const res = generateLocalGroundedResponse(query, "google/gemini-3.5-flash-lite");

      expect(res.content).toContain("Bekasi");
      expect(res.content).toContain("LRT Jabodebek");
      expect(res.content).toContain("BNI City");
      expect(res.content).toContain("KAI Bandara");
      expect(res.content).toContain("Skytrain");
    });

    it("reasons accurately about CSW-ASEAN 5-level skybridge hub", () => {
      const query = "How does the CSW ASEAN skybridge work?";
      const res = generateLocalGroundedResponse(query, "qwen/qwen3.7-plus");

      expect(res.content).toContain("CSW");
      expect(res.content).toContain("ASEAN");
      expect(res.content).toContain("Corridor 13");
      expect(res.content).toContain("Level 1");
      expect(res.content).toContain("Level 5");
    });

    it("reasons accurately about Kepulauan Seribu speedboats", () => {
      const query = "How to go to Pulau Pramuka or Pari in Kepulauan Seribu from Muara Angke or Marina Ancol?";
      const res = generateLocalGroundedResponse(query, "google/gemma-4-26b-a4b-it");

      expect(res.content).toContain("Muara Angke");
      expect(res.content).toContain("Marina Ancol");
      expect(res.content).toContain("Speedboat");
      expect(res.suggestedLines).toContain("line-maritime-seribu");
    });
  });

  describe("4. Prompt Suggestions & Query Dispatcher", () => {
    it("provides curated prompt suggestions across all 4 categories", () => {
      expect(PROMPT_SUGGESTIONS.length).toBeGreaterThanOrEqual(6);
      const categories = PROMPT_SUGGESTIONS.map((s) => s.category);
      expect(categories).toContain("ROUTE");
      expect(categories).toContain("TRANSFER");
      expect(categories).toContain("FARE");
      expect(categories).toContain("AIRPORT_ISLAND");
    });

    it("executes queryTransitAdvisor successfully with fallback when no API key is provided", async () => {
      const res = await queryTransitAdvisor([
        { role: "user", content: "Fastest way from Halim to Dukuh Atas?" },
      ]);

      expect(res).toBeDefined();
      expect(res.content).toBeTruthy();
      expect(res.modelUsed).toBe("google/gemini-3.7-flash");
      expect(res.fallbackUsed).toBe(true);
      expect(res.timestamp).toBeTruthy();
    });
  });
});
