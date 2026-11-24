import { connection } from "next/server";
import { claudeKey, MAX_INPUT_CHARS, MODEL, PROVIDER } from "../liveConfig";

export async function GET() {
  await connection();
  return Response.json(
    { liveAvailable: Boolean(claudeKey()), model: MODEL, provider: PROVIDER, maxInputChars: MAX_INPUT_CHARS },
    { headers: { "Cache-Control": "no-store" } },
  );
}
