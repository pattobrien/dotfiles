export class Uid {
  readonly uid: number;
  constructor(uid: number) {
    this.uid = uid;
  }
}

export type Plist =
  | string
  | number
  | boolean
  | Date
  | Uid
  | Plist[]
  | { [key: string]: Plist };

type Token = { close: boolean; tag: string; empty: boolean; text: string };

const entities: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'",
};

const decode = (text: string) =>
  text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (entity, name: string) => {
    if (name.startsWith("#x") || name.startsWith("#X")) {
      return String.fromCodePoint(parseInt(name.slice(2), 16));
    }
    if (name.startsWith("#"))
      return String.fromCodePoint(Number(name.slice(1)));
    if (entity in entities) return entities[entity];
    throw new Error(`plist: unknown entity ${entity}`);
  });

const tokenize = (xml: string): Token[] =>
  [
    ...xml
      .slice(xml.indexOf("<plist"))
      .matchAll(/<(\/?)([a-z]+)[^>]*?(\/?)>([^<]*)/g),
  ].map(([, close, tag, empty, text]) => ({
    close: close === "/",
    tag,
    empty: empty === "/",
    text: decode(text),
  }));

export const parsePlist = (xml: string): Plist => {
  if (/<!\[CDATA\[|<!--/.test(xml)) {
    throw new Error("plist: CDATA and comments are not supported");
  }
  const tokens = tokenize(xml);
  let at = 1;

  const value = (): Plist => {
    const { tag, empty, text } = tokens[at++];
    if (empty) {
      if (tag === "true" || tag === "false") return tag === "true";
      if (tag === "dict") return {};
      if (tag === "array") return [];
      if (tag === "string" || tag === "data") return "";
      throw new Error(`plist: unexpected empty <${tag}/>`);
    }
    if (tag === "dict") {
      const dict: { [key: string]: Plist } = {};
      while (!tokens[at].close) {
        const key = tokens[at++];
        if (!key.empty) at++;
        dict[key.empty ? "" : key.text] = value();
      }
      at++;
      const uid = dict["CF$UID"];
      return typeof uid === "number" && Object.keys(dict).length === 1
        ? new Uid(uid)
        : dict;
    }
    if (tag === "array") {
      const list: Plist[] = [];
      while (!tokens[at].close) list.push(value());
      at++;
      return list;
    }
    at++;
    if (tag === "string" || tag === "data") return text;
    if (tag === "real" && /^[+-]?infinity$/.test(text)) {
      return text.startsWith("-") ? -Infinity : Infinity;
    }
    if (tag === "integer" || tag === "real") return Number(text);
    if (tag === "date") return new Date(text);
    throw new Error(`plist: unexpected <${tag}>`);
  };

  return value();
};

export const isDict = (
  value: Plist | undefined,
): value is { [key: string]: Plist } =>
  typeof value === "object" &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  !(value instanceof Uid);
