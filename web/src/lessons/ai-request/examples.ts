import type { Fixture } from "@/execution/demoAdapter";
import raw from "./fixtures.json";

/** The checked-in fixtures supply the questions and timed answers. */
export const EXAMPLES = raw as unknown as Fixture[];
