/**
 * Incremental parser for Server-Sent Events frames. Feed it decoded text as it
 * arrives; it returns every complete frame and keeps the rest buffered.
 */

export interface SseFrame {
  event: string;
  data: string;
}

export function createSseParser() {
  let buffer = "";
  let skipLeadingNewline = false;

  return function push(text: string): SseFrame[] {
    if (text.length === 0) return [];
    const startsWithPairedNewline = skipLeadingNewline && text.startsWith("\n");
    skipLeadingNewline = text.endsWith("\r");
    if (startsWithPairedNewline) text = text.slice(1);
    buffer += text.replace(/\r\n?/g, "\n");
    const frames: SseFrame[] = [];
    let boundary = buffer.indexOf("\n\n");

    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const frame = parseBlock(block);
      if (frame) frames.push(frame);
      boundary = buffer.indexOf("\n\n");
    }
    return frames;
  };
}

function parseBlock(block: string): SseFrame | null {
  let event = "message";
  const data: string[] = [];

  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue; // blank or comment (keep-alive)
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }

  if (data.length === 0) return null;
  return { event, data: data.join("\n") };
}
