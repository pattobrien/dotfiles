export interface Osc8Link {
  url: string;
  text: string;
}

const OSC8_OPEN = /\x1b\]8;[^;\x07\x1b]*;([^\x07\x1b]*)(?:\x07|\x1b\\)/g;
const OSC8_CLOSE = /\x1b\]8;;(?:\x07|\x1b\\)/;
const CSI = /\x1b\[[0-9;?]*[A-Za-z]/g;

/**
 * Every OSC 8 hyperlink in a raw terminal stream: the URL and the text the
 * emitter wrapped between the open and close sequences, with SGR/cursor
 * sequences stripped.
 */
export function osc8Links(raw: string): Osc8Link[] {
  const links: Osc8Link[] = [];
  for (const open of raw.matchAll(OSC8_OPEN)) {
    const after = raw.slice(open.index + open[0].length);
    const close = OSC8_CLOSE.exec(after);
    if (!close) continue;
    const text = after.slice(0, close.index).replace(CSI, "");
    if (text.length > 0) links.push({ url: open[1]!, text });
  }
  return links;
}
