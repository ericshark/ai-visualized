import type { Fixture } from "@/execution/demoAdapter";
import raw from "./fixtures.json";

export interface Example extends Fixture {
  label: string;
}

/** Sample runs for demo mode. The checked-in fixtures are the source for sample runs. */
export const EXAMPLES = raw as unknown as Example[];
