import Anthropic from "@anthropic-ai/sdk";
import { Hazard } from "@/lib/types";

// A hazard as returned by the vision model, before the route stamps it with an
// id and a time_offset into the recording.
export type AnalyzedHazard = Omit<Hazard, "id" | "time_offset">;

// Per-keyframe analysis runs many times per scan, so it uses the fast, low-cost
// Haiku tier (vision and structured outputs capable) rather than Opus.
const MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `You are a fire-safety inspector for Korean traditional street markets (전통시장). These markets are tightly packed with stalls, so one stall fire can spread and destroy the whole market. You are shown a single frame from a vendor scanning their stall with a phone camera.

Identify visible hazards that could start a fire or help one spread. Look for:
- Ignition sources: open flames, gas burners, portable stoves, space heaters, hot cooking equipment.
- Electrical hazards: overloaded outlets, daisy-chained power strips, exposed or tangled wiring, damaged cables.
- Fuel: LPG or propane cylinders (especially near heat), flammable liquids, cooking oil.
- Fuel load: piled cardboard, cloth, packaging, or other combustibles that let fire spread.
- Blocked egress: aisles or exits obstructed by goods.

Report only hazards you can actually see in the frame. If there are none, return an empty list. For each hazard, give a short specific label, its category, severity, a normalized bounding box, and one concrete, actionable fix a vendor can do. Keep recommendations to a single short sentence. Do not use hyphens or em dashes to join clauses.

Bounding box coordinates are fractions of the frame from 0 to 1, origin at the top-left: x and y are the top-left corner, width and height are the box size.`;

const HAZARD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    hazards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          category: {
            type: "string",
            enum: [
              Hazard.CATEGORY_IGNITION,
              Hazard.CATEGORY_ELECTRICAL,
              Hazard.CATEGORY_FUEL,
              Hazard.CATEGORY_FUEL_LOAD,
              Hazard.CATEGORY_EGRESS,
            ],
          },
          severity: {
            type: "string",
            enum: [
              Hazard.SEVERITY_LOW,
              Hazard.SEVERITY_MEDIUM,
              Hazard.SEVERITY_HIGH,
              Hazard.SEVERITY_CRITICAL,
            ],
          },
          confidence: { type: "number" },
          recommendation: { type: "string" },
          box: {
            type: "object",
            additionalProperties: false,
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" },
            },
            required: ["x", "y", "width", "height"],
          },
        },
        required: ["label", "category", "severity", "confidence", "recommendation", "box"],
      },
    },
  },
  required: ["hazards"],
} as const;

let client: Anthropic | null = null;

function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY)
    throw new Error("ANTHROPIC_API_KEY must be set");
  client ??= new Anthropic();
  return client;
}

// Analyse a single scan keyframe (base64 JPEG) and return the fire hazards
// visible in it. The caller stamps each hazard with an id and time_offset.
export async function analyzeHazards(imageBase64: string): Promise<AnalyzedHazard[]> {
  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: HAZARD_SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
          },
          { type: "text", text: "Identify the fire hazards visible in this frame." },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text")
    return [];

  const parsed = JSON.parse(textBlock.text) as { hazards?: AnalyzedHazard[] };
  const hazards = parsed.hazards ?? [];
  return hazards.map((hazard) => ({
    ...hazard,
    confidence: Number.isFinite(hazard.confidence) ? hazard.confidence : 0,
    method: Hazard.METHOD_MODEL,
  }));
}
