var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};
var __decorateParam = (index, decorator) => (target, key) => decorator(target, key, index);

// src/common/input/TextDecoder.ts
function stringFromCodePoint(codePoint) {
  if (codePoint > 65535) {
    codePoint -= 65536;
    return String.fromCharCode((codePoint >> 10) + 55296) + String.fromCharCode(codePoint % 1024 + 56320);
  }
  return String.fromCharCode(codePoint);
}
function utf32ToString(data, start = 0, end = data.length) {
  let result = "";
  for (let i = start; i < end; ++i) {
    let codepoint = data[i];
    if (codepoint > 65535) {
      codepoint -= 65536;
      result += String.fromCharCode((codepoint >> 10) + 55296) + String.fromCharCode(codepoint % 1024 + 56320);
    } else {
      result += String.fromCharCode(codepoint);
    }
  }
  return result;
}
var StringToUtf32 = class {
  constructor() {
    this._interim = 0;
  }
  /**
   * Clears interim and resets decoder to clean state.
   */
  clear() {
    this._interim = 0;
  }
  /**
   * Decode JS string to UTF32 codepoints.
   * The methods assumes stream input and will store partly transmitted
   * surrogate pairs and decode them with the next data chunk.
   * Note: The method does no bound checks for target, therefore make sure
   * the provided input data does not exceed the size of `target`.
   * Returns the number of written codepoints in `target`.
   */
  decode(input, target) {
    const length = input.length;
    if (!length) {
      return 0;
    }
    let size = 0;
    let startPos = 0;
    if (this._interim) {
      const second = input.charCodeAt(startPos++);
      if (56320 <= second && second <= 57343) {
        target[size++] = (this._interim - 55296) * 1024 + second - 56320 + 65536;
      } else {
        target[size++] = this._interim;
        target[size++] = second;
      }
      this._interim = 0;
    }
    for (let i = startPos; i < length; ++i) {
      const code = input.charCodeAt(i);
      if (55296 <= code && code <= 56319) {
        if (++i >= length) {
          this._interim = code;
          return size;
        }
        const second = input.charCodeAt(i);
        if (56320 <= second && second <= 57343) {
          target[size++] = (code - 55296) * 1024 + second - 56320 + 65536;
        } else {
          target[size++] = code;
          target[size++] = second;
        }
        continue;
      }
      if (code === 65279) {
        continue;
      }
      target[size++] = code;
    }
    return size;
  }
};
var Utf8ToUtf32 = class {
  constructor() {
    this.interim = new Uint8Array(3);
  }
  /**
   * Clears interim bytes and resets decoder to clean state.
   */
  clear() {
    this.interim.fill(0);
  }
  /**
   * Decodes UTF8 byte sequences in `input` to UTF32 codepoints in `target`.
   * The methods assumes stream input and will store partly transmitted bytes
   * and decode them with the next data chunk.
   * Note: The method does no bound checks for target, therefore make sure
   * the provided data chunk does not exceed the size of `target`.
   * Returns the number of written codepoints in `target`.
   */
  decode(input, target) {
    const length = input.length;
    if (!length) {
      return 0;
    }
    let size = 0;
    let byte1;
    let byte2;
    let byte3;
    let byte4;
    let codepoint;
    let startPos = 0;
    if (this.interim[0]) {
      let discardInterim = false;
      let cp = this.interim[0];
      cp &= (cp & 224) === 192 ? 31 : (cp & 240) === 224 ? 15 : 7;
      let pos = 0;
      let tmp;
      while ((tmp = this.interim[++pos]) && pos < 4) {
        cp <<= 6;
        cp |= tmp & 63;
      }
      const type = (this.interim[0] & 224) === 192 ? 2 : (this.interim[0] & 240) === 224 ? 3 : 4;
      const missing = type - pos;
      while (startPos < missing) {
        if (startPos >= length) {
          return 0;
        }
        tmp = input[startPos++];
        if ((tmp & 192) !== 128) {
          startPos--;
          discardInterim = true;
          break;
        } else {
          this.interim[pos++] = tmp;
          cp <<= 6;
          cp |= tmp & 63;
        }
      }
      if (!discardInterim) {
        if (type === 2) {
          if (cp < 128) {
            startPos--;
          } else {
            target[size++] = cp;
          }
        } else if (type === 3) {
          if (cp < 2048 || cp >= 55296 && cp <= 57343 || cp === 65279) {
          } else {
            target[size++] = cp;
          }
        } else {
          if (cp < 65536 || cp > 1114111) {
          } else {
            target[size++] = cp;
          }
        }
      }
      this.interim.fill(0);
    }
    const fourStop = length - 4;
    let i = startPos;
    while (i < length) {
      while (i < fourStop && !((byte1 = input[i]) & 128) && !((byte2 = input[i + 1]) & 128) && !((byte3 = input[i + 2]) & 128) && !((byte4 = input[i + 3]) & 128)) {
        target[size++] = byte1;
        target[size++] = byte2;
        target[size++] = byte3;
        target[size++] = byte4;
        i += 4;
      }
      byte1 = input[i++];
      if (byte1 < 128) {
        target[size++] = byte1;
      } else if ((byte1 & 224) === 192) {
        if (i >= length) {
          this.interim[0] = byte1;
          return size;
        }
        byte2 = input[i++];
        if ((byte2 & 192) !== 128) {
          i--;
          continue;
        }
        codepoint = (byte1 & 31) << 6 | byte2 & 63;
        if (codepoint < 128) {
          i--;
          continue;
        }
        target[size++] = codepoint;
      } else if ((byte1 & 240) === 224) {
        if (i >= length) {
          this.interim[0] = byte1;
          return size;
        }
        byte2 = input[i++];
        if ((byte2 & 192) !== 128) {
          i--;
          continue;
        }
        if (i >= length) {
          this.interim[0] = byte1;
          this.interim[1] = byte2;
          return size;
        }
        byte3 = input[i++];
        if ((byte3 & 192) !== 128) {
          i--;
          continue;
        }
        codepoint = (byte1 & 15) << 12 | (byte2 & 63) << 6 | byte3 & 63;
        if (codepoint < 2048 || codepoint >= 55296 && codepoint <= 57343 || codepoint === 65279) {
          continue;
        }
        target[size++] = codepoint;
      } else if ((byte1 & 248) === 240) {
        if (i >= length) {
          this.interim[0] = byte1;
          return size;
        }
        byte2 = input[i++];
        if ((byte2 & 192) !== 128) {
          i--;
          continue;
        }
        if (i >= length) {
          this.interim[0] = byte1;
          this.interim[1] = byte2;
          return size;
        }
        byte3 = input[i++];
        if ((byte3 & 192) !== 128) {
          i--;
          continue;
        }
        if (i >= length) {
          this.interim[0] = byte1;
          this.interim[1] = byte2;
          this.interim[2] = byte3;
          return size;
        }
        byte4 = input[i++];
        if ((byte4 & 192) !== 128) {
          i--;
          continue;
        }
        codepoint = (byte1 & 7) << 18 | (byte2 & 63) << 12 | (byte3 & 63) << 6 | byte4 & 63;
        if (codepoint < 65536 || codepoint > 1114111) {
          continue;
        }
        target[size++] = codepoint;
      } else {
      }
    }
    return size;
  }
};

// src/common/buffer/Constants.ts
var DEFAULT_COLOR = 0;
var DEFAULT_ATTR = 0 << 18 | DEFAULT_COLOR << 9 | 256 << 0;
var CHAR_DATA_ATTR_INDEX = 0;
var CHAR_DATA_CHAR_INDEX = 1;
var CHAR_DATA_WIDTH_INDEX = 2;
var CHAR_DATA_CODE_INDEX = 3;
var NULL_CELL_CHAR = "";
var NULL_CELL_WIDTH = 1;
var NULL_CELL_CODE = 0;
var WHITESPACE_CELL_CHAR = " ";
var WHITESPACE_CELL_WIDTH = 1;
var WHITESPACE_CELL_CODE = 32;

// src/common/buffer/AttributeData.ts
var AttributeData = class _AttributeData {
  constructor() {
    // data
    this.fg = 0;
    this.bg = 0;
    this.extended = new ExtendedAttrs();
  }
  static toColorRGB(value) {
    return [
      value >>> 16 /* RED_SHIFT */ & 255,
      value >>> 8 /* GREEN_SHIFT */ & 255,
      value & 255
    ];
  }
  static fromColorRGB(value) {
    return (value[0] & 255) << 16 /* RED_SHIFT */ | (value[1] & 255) << 8 /* GREEN_SHIFT */ | value[2] & 255;
  }
  clone() {
    const newObj = new _AttributeData();
    newObj.fg = this.fg;
    newObj.bg = this.bg;
    newObj.extended = this.extended.clone();
    return newObj;
  }
  // flags
  isInverse() {
    return this.fg & 67108864 /* INVERSE */;
  }
  isBold() {
    return this.fg & 134217728 /* BOLD */;
  }
  isUnderline() {
    if (this.hasExtendedAttrs() && this.extended.underlineStyle !== 0 /* NONE */) {
      return 1;
    }
    return this.fg & 268435456 /* UNDERLINE */;
  }
  isBlink() {
    return this.fg & 536870912 /* BLINK */;
  }
  isInvisible() {
    return this.fg & 1073741824 /* INVISIBLE */;
  }
  isItalic() {
    return this.bg & 67108864 /* ITALIC */;
  }
  isDim() {
    return this.bg & 134217728 /* DIM */;
  }
  isStrikethrough() {
    return this.fg & 2147483648 /* STRIKETHROUGH */;
  }
  isProtected() {
    return this.bg & 536870912 /* PROTECTED */;
  }
  isOverline() {
    return this.bg & 1073741824 /* OVERLINE */;
  }
  // color modes
  getFgColorMode() {
    return this.fg & 50331648 /* CM_MASK */;
  }
  getBgColorMode() {
    return this.bg & 50331648 /* CM_MASK */;
  }
  isFgRGB() {
    return (this.fg & 50331648 /* CM_MASK */) === 50331648 /* CM_RGB */;
  }
  isBgRGB() {
    return (this.bg & 50331648 /* CM_MASK */) === 50331648 /* CM_RGB */;
  }
  isFgPalette() {
    return (this.fg & 50331648 /* CM_MASK */) === 16777216 /* CM_P16 */ || (this.fg & 50331648 /* CM_MASK */) === 33554432 /* CM_P256 */;
  }
  isBgPalette() {
    return (this.bg & 50331648 /* CM_MASK */) === 16777216 /* CM_P16 */ || (this.bg & 50331648 /* CM_MASK */) === 33554432 /* CM_P256 */;
  }
  isFgDefault() {
    return (this.fg & 50331648 /* CM_MASK */) === 0;
  }
  isBgDefault() {
    return (this.bg & 50331648 /* CM_MASK */) === 0;
  }
  isAttributeDefault() {
    return this.fg === 0 && this.bg === 0;
  }
  // colors
  getFgColor() {
    switch (this.fg & 50331648 /* CM_MASK */) {
      case 16777216 /* CM_P16 */:
      case 33554432 /* CM_P256 */:
        return this.fg & 255 /* PCOLOR_MASK */;
      case 50331648 /* CM_RGB */:
        return this.fg & 16777215 /* RGB_MASK */;
      default:
        return -1;
    }
  }
  getBgColor() {
    switch (this.bg & 50331648 /* CM_MASK */) {
      case 16777216 /* CM_P16 */:
      case 33554432 /* CM_P256 */:
        return this.bg & 255 /* PCOLOR_MASK */;
      case 50331648 /* CM_RGB */:
        return this.bg & 16777215 /* RGB_MASK */;
      default:
        return -1;
    }
  }
  // extended attrs
  hasExtendedAttrs() {
    return this.bg & 268435456 /* HAS_EXTENDED */;
  }
  updateExtended() {
    if (this.extended.isEmpty()) {
      this.bg &= ~268435456 /* HAS_EXTENDED */;
    } else {
      this.bg |= 268435456 /* HAS_EXTENDED */;
    }
  }
  getUnderlineColor() {
    if (this.bg & 268435456 /* HAS_EXTENDED */ && ~this.extended.underlineColor) {
      switch (this.extended.underlineColor & 50331648 /* CM_MASK */) {
        case 16777216 /* CM_P16 */:
        case 33554432 /* CM_P256 */:
          return this.extended.underlineColor & 255 /* PCOLOR_MASK */;
        case 50331648 /* CM_RGB */:
          return this.extended.underlineColor & 16777215 /* RGB_MASK */;
        default:
          return this.getFgColor();
      }
    }
    return this.getFgColor();
  }
  getUnderlineColorMode() {
    return this.bg & 268435456 /* HAS_EXTENDED */ && ~this.extended.underlineColor ? this.extended.underlineColor & 50331648 /* CM_MASK */ : this.getFgColorMode();
  }
  isUnderlineColorRGB() {
    return this.bg & 268435456 /* HAS_EXTENDED */ && ~this.extended.underlineColor ? (this.extended.underlineColor & 50331648 /* CM_MASK */) === 50331648 /* CM_RGB */ : this.isFgRGB();
  }
  isUnderlineColorPalette() {
    return this.bg & 268435456 /* HAS_EXTENDED */ && ~this.extended.underlineColor ? (this.extended.underlineColor & 50331648 /* CM_MASK */) === 16777216 /* CM_P16 */ || (this.extended.underlineColor & 50331648 /* CM_MASK */) === 33554432 /* CM_P256 */ : this.isFgPalette();
  }
  isUnderlineColorDefault() {
    return this.bg & 268435456 /* HAS_EXTENDED */ && ~this.extended.underlineColor ? (this.extended.underlineColor & 50331648 /* CM_MASK */) === 0 : this.isFgDefault();
  }
  getUnderlineStyle() {
    return this.fg & 268435456 /* UNDERLINE */ ? this.bg & 268435456 /* HAS_EXTENDED */ ? this.extended.underlineStyle : 1 /* SINGLE */ : 0 /* NONE */;
  }
  getUnderlineVariantOffset() {
    return this.extended.underlineVariantOffset;
  }
};
var ExtendedAttrs = class _ExtendedAttrs {
  constructor(ext = 0, urlId = 0) {
    this._ext = 0;
    this._urlId = 0;
    this._ext = ext;
    this._urlId = urlId;
  }
  get ext() {
    if (this._urlId) {
      return this._ext & ~469762048 /* UNDERLINE_STYLE */ | this.underlineStyle << 26;
    }
    return this._ext;
  }
  set ext(value) {
    this._ext = value;
  }
  get underlineStyle() {
    if (this._urlId) {
      return 5 /* DASHED */;
    }
    return (this._ext & 469762048 /* UNDERLINE_STYLE */) >> 26;
  }
  set underlineStyle(value) {
    this._ext &= ~469762048 /* UNDERLINE_STYLE */;
    this._ext |= value << 26 & 469762048 /* UNDERLINE_STYLE */;
  }
  get underlineColor() {
    return this._ext & (50331648 /* CM_MASK */ | 16777215 /* RGB_MASK */);
  }
  set underlineColor(value) {
    this._ext &= ~(50331648 /* CM_MASK */ | 16777215 /* RGB_MASK */);
    this._ext |= value & (50331648 /* CM_MASK */ | 16777215 /* RGB_MASK */);
  }
  get urlId() {
    return this._urlId;
  }
  set urlId(value) {
    this._urlId = value;
  }
  get underlineVariantOffset() {
    const val = (this._ext & 3758096384 /* VARIANT_OFFSET */) >> 29;
    if (val < 0) {
      return val ^ 4294967288;
    }
    return val;
  }
  set underlineVariantOffset(value) {
    this._ext &= ~3758096384 /* VARIANT_OFFSET */;
    this._ext |= value << 29 & 3758096384 /* VARIANT_OFFSET */;
  }
  clone() {
    return new _ExtendedAttrs(this._ext, this._urlId);
  }
  /**
   * Convenient method to indicate whether the object holds no additional information,
   * that needs to be persistant in the buffer.
   */
  isEmpty() {
    return this.underlineStyle === 0 /* NONE */ && this._urlId === 0;
  }
};

// src/common/buffer/CellData.ts
var CellData = class _CellData extends AttributeData {
  constructor() {
    super(...arguments);
    /** Primitives from terminal buffer. */
    this.content = 0;
    this.fg = 0;
    this.bg = 0;
    this.extended = new ExtendedAttrs();
    this.combinedData = "";
  }
  /** Helper to create CellData from CharData. */
  static fromCharData(value) {
    const obj = new _CellData();
    obj.setFromCharData(value);
    return obj;
  }
  /** Whether cell contains a combined string. */
  isCombined() {
    return this.content & 2097152 /* IS_COMBINED_MASK */;
  }
  /** Width of the cell. */
  getWidth() {
    return this.content >> 22 /* WIDTH_SHIFT */;
  }
  /** JS string of the content. */
  getChars() {
    if (this.content & 2097152 /* IS_COMBINED_MASK */) {
      return this.combinedData;
    }
    if (this.content & 2097151 /* CODEPOINT_MASK */) {
      return stringFromCodePoint(this.content & 2097151 /* CODEPOINT_MASK */);
    }
    return "";
  }
  /**
   * Codepoint of cell
   * Note this returns the UTF32 codepoint of single chars,
   * if content is a combined string it returns the codepoint
   * of the last char in string to be in line with code in CharData.
   */
  getCode() {
    return this.isCombined() ? this.combinedData.charCodeAt(this.combinedData.length - 1) : this.content & 2097151 /* CODEPOINT_MASK */;
  }
  /** Set data from CharData */
  setFromCharData(value) {
    this.fg = value[CHAR_DATA_ATTR_INDEX];
    this.bg = 0;
    let combined = false;
    if (value[CHAR_DATA_CHAR_INDEX].length > 2) {
      combined = true;
    } else if (value[CHAR_DATA_CHAR_INDEX].length === 2) {
      const code = value[CHAR_DATA_CHAR_INDEX].charCodeAt(0);
      if (55296 <= code && code <= 56319) {
        const second = value[CHAR_DATA_CHAR_INDEX].charCodeAt(1);
        if (56320 <= second && second <= 57343) {
          this.content = (code - 55296) * 1024 + second - 56320 + 65536 | value[CHAR_DATA_WIDTH_INDEX] << 22 /* WIDTH_SHIFT */;
        } else {
          combined = true;
        }
      } else {
        combined = true;
      }
    } else {
      this.content = value[CHAR_DATA_CHAR_INDEX].charCodeAt(0) | value[CHAR_DATA_WIDTH_INDEX] << 22 /* WIDTH_SHIFT */;
    }
    if (combined) {
      this.combinedData = value[CHAR_DATA_CHAR_INDEX];
      this.content = 2097152 /* IS_COMBINED_MASK */ | value[CHAR_DATA_WIDTH_INDEX] << 22 /* WIDTH_SHIFT */;
    }
  }
  /** Get data as CharData. */
  getAsCharData() {
    return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
  }
  attributesEquals(other) {
    if (this.getFgColorMode() !== other.getFgColorMode() || this.getFgColor() !== other.getFgColor()) {
      return false;
    }
    if (this.getBgColorMode() !== other.getBgColorMode() || this.getBgColor() !== other.getBgColor()) {
      return false;
    }
    if (this.isInverse() !== other.isInverse()) {
      return false;
    }
    if (this.isBold() !== other.isBold()) {
      return false;
    }
    if (this.isUnderline() !== other.isUnderline()) {
      return false;
    }
    if (this.isUnderline()) {
      if (this.getUnderlineStyle() !== other.getUnderlineStyle()) {
        return false;
      }
      const thisDefault = this.isUnderlineColorDefault();
      const otherDefault = other.isUnderlineColorDefault();
      if (!(thisDefault && otherDefault)) {
        if (thisDefault !== otherDefault) {
          return false;
        }
        if (this.getUnderlineColor() !== other.getUnderlineColor()) {
          return false;
        }
        if (this.getUnderlineColorMode() !== other.getUnderlineColorMode()) {
          return false;
        }
      }
    }
    if (this.isOverline() !== other.isOverline()) {
      return false;
    }
    if (this.isBlink() !== other.isBlink()) {
      return false;
    }
    if (this.isInvisible() !== other.isInvisible()) {
      return false;
    }
    if (this.isItalic() !== other.isItalic()) {
      return false;
    }
    if (this.isDim() !== other.isDim()) {
      return false;
    }
    if (this.isStrikethrough() !== other.isStrikethrough()) {
      return false;
    }
    return true;
  }
};

// src/common/public/BufferLineApiView.ts
var BufferLineApiView = class {
  constructor(_line) {
    this._line = _line;
  }
  get isWrapped() {
    return this._line.isWrapped;
  }
  get length() {
    return this._line.length;
  }
  getCell(x, cell) {
    if (x < 0 || x >= this._line.length) {
      return void 0;
    }
    if (cell) {
      this._line.loadCell(x, cell);
      return cell;
    }
    return this._line.loadCell(x, new CellData());
  }
  translateToString(trimRight, startColumn, endColumn) {
    return this._line.translateToString(trimRight, startColumn, endColumn);
  }
};

// src/common/public/BufferApiView.ts
var BufferApiView = class {
  constructor(_buffer, type) {
    this._buffer = _buffer;
    this.type = type;
  }
  init(buffer) {
    this._buffer = buffer;
    return this;
  }
  get cursorY() {
    return this._buffer.y;
  }
  get cursorX() {
    return this._buffer.x;
  }
  get viewportY() {
    return this._buffer.ydisp;
  }
  get baseY() {
    return this._buffer.ybase;
  }
  get length() {
    return this._buffer.lines.length;
  }
  getLine(y) {
    const line = this._buffer.lines.get(y);
    if (!line) {
      return void 0;
    }
    return new BufferLineApiView(line);
  }
  getNullCell() {
    return new CellData();
  }
};

// src/common/Lifecycle.ts
function toDisposable(fn) {
  return { dispose: fn };
}
function dispose(arg) {
  if (!arg) {
    return arg;
  }
  if (Array.isArray(arg)) {
    for (const d of arg) {
      d.dispose();
    }
    return [];
  }
  arg.dispose();
  return arg;
}
var DisposableStore = class {
  constructor() {
    this._disposables = /* @__PURE__ */ new Set();
    this._isDisposed = false;
  }
  get isDisposed() {
    return this._isDisposed;
  }
  add(o) {
    if (this._isDisposed) {
      o.dispose();
    } else {
      this._disposables.add(o);
    }
    return o;
  }
  dispose() {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables.clear();
  }
  clear() {
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables.clear();
  }
};
var Disposable = class {
  constructor() {
    this._store = new DisposableStore();
  }
  dispose() {
    this._store.dispose();
  }
  _register(o) {
    return this._store.add(o);
  }
};
Disposable.None = Object.freeze({ dispose() {
} });
var MutableDisposable = class {
  constructor() {
    this._isDisposed = false;
  }
  get value() {
    return this._isDisposed ? void 0 : this._value;
  }
  set value(value) {
    if (this._isDisposed || value === this._value) {
      return;
    }
    this._value?.dispose();
    this._value = value;
  }
  clear() {
    this.value = void 0;
  }
  dispose() {
    this._isDisposed = true;
    this._value?.dispose();
    this._value = void 0;
  }
};

// src/common/Event.ts
var Emitter = class {
  constructor() {
    this._listeners = [];
    this._disposed = false;
  }
  get event() {
    if (this._event) {
      return this._event;
    }
    this._event = (listener, thisArgs, disposables) => {
      if (this._disposed) {
        return toDisposable(() => {
        });
      }
      const entry = { fn: listener, thisArgs };
      this._listeners.push(entry);
      const result = toDisposable(() => {
        const idx = this._listeners.indexOf(entry);
        if (idx !== -1) {
          this._listeners.splice(idx, 1);
        }
      });
      if (disposables) {
        if (Array.isArray(disposables)) {
          disposables.push(result);
        } else {
          disposables.add(result);
        }
      }
      return result;
    };
    return this._event;
  }
  fire(event) {
    if (this._disposed) {
      return;
    }
    switch (this._listeners.length) {
      case 0:
        return;
      case 1: {
        const { fn, thisArgs } = this._listeners[0];
        fn.call(thisArgs, event);
        return;
      }
      default: {
        const listeners = this._listeners.slice();
        for (const { fn, thisArgs } of listeners) {
          fn.call(thisArgs, event);
        }
      }
    }
  }
  dispose() {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    this._listeners.length = 0;
  }
};
var EventUtils;
((EventUtils2) => {
  function forward(from, to) {
    return from((e) => to.fire(e));
  }
  EventUtils2.forward = forward;
  function map(event, map2) {
    return (listener, thisArgs, disposables) => {
      return event((i) => listener.call(thisArgs, map2(i)), void 0, disposables);
    };
  }
  EventUtils2.map = map;
  function any(...events) {
    return (listener, thisArgs, disposables) => {
      const store = new DisposableStore();
      for (const event of events) {
        store.add(event((e) => listener.call(thisArgs, e)));
      }
      if (disposables) {
        if (Array.isArray(disposables)) {
          disposables.push(store);
        } else {
          disposables.add(store);
        }
      }
      return store;
    };
  }
  EventUtils2.any = any;
  function runAndSubscribe(event, handler, initial) {
    handler(initial);
    return event((e) => handler(e));
  }
  EventUtils2.runAndSubscribe = runAndSubscribe;
})(EventUtils || (EventUtils = {}));

// src/common/public/BufferNamespaceApi.ts
var BufferNamespaceApi = class extends Disposable {
  constructor(_core) {
    super();
    this._core = _core;
    this._onBufferChange = this._register(new Emitter());
    this.onBufferChange = this._onBufferChange.event;
    this._normal = new BufferApiView(this._core.buffers.normal, "normal");
    this._alternate = new BufferApiView(this._core.buffers.alt, "alternate");
    this._register(this._core.buffers.onBufferActivate(() => this._onBufferChange.fire(this.active)));
  }
  get active() {
    if (this._core.buffers.active === this._core.buffers.normal) {
      return this.normal;
    }
    if (this._core.buffers.active === this._core.buffers.alt) {
      return this.alternate;
    }
    throw new Error("Active buffer is neither normal nor alternate");
  }
  get normal() {
    return this._normal.init(this._core.buffers.normal);
  }
  get alternate() {
    return this._alternate.init(this._core.buffers.alt);
  }
};

// src/common/public/ParserApi.ts
var ParserApi = class {
  constructor(_core) {
    this._core = _core;
  }
  registerCsiHandler(id, callback) {
    return this._core.registerCsiHandler(id, (params) => callback(params.toArray()));
  }
  addCsiHandler(id, callback) {
    return this.registerCsiHandler(id, callback);
  }
  registerDcsHandler(id, callback) {
    return this._core.registerDcsHandler(id, (data, params) => callback(data, params.toArray()));
  }
  addDcsHandler(id, callback) {
    return this.registerDcsHandler(id, callback);
  }
  registerEscHandler(id, handler) {
    return this._core.registerEscHandler(id, handler);
  }
  addEscHandler(id, handler) {
    return this.registerEscHandler(id, handler);
  }
  registerOscHandler(ident, callback) {
    return this._core.registerOscHandler(ident, callback);
  }
  addOscHandler(ident, callback) {
    return this.registerOscHandler(ident, callback);
  }
  registerApcHandler(id, callback) {
    return this._core.registerApcHandler(id, callback);
  }
};

// src/common/public/UnicodeApi.ts
var UnicodeApi = class {
  constructor(_core) {
    this._core = _core;
  }
  register(provider) {
    this._core.unicodeService.register(provider);
  }
  get versions() {
    return this._core.unicodeService.versions;
  }
  get activeVersion() {
    return this._core.unicodeService.activeVersion;
  }
  set activeVersion(version) {
    this._core.unicodeService.activeVersion = version;
  }
};

// src/common/StringBuilder.ts
var StringBuilder = class {
  constructor() {
    this._chunks = [];
    this._length = 0;
  }
  get length() {
    return this._length;
  }
  reset() {
    this._chunks.length = 0;
    this._length = 0;
  }
  append(chunk) {
    this._chunks.push(chunk);
    this._length += chunk.length;
  }
  toString() {
    return this._chunks.join("");
  }
};
var LimitedStringBuilder = class {
  constructor(_limit) {
    this._limit = _limit;
    this._builder = new StringBuilder();
  }
  get length() {
    return this._builder.length;
  }
  get limit() {
    return this._limit;
  }
  reset() {
    this._builder.reset();
  }
  /**
   * @returns true if the limit was exceeded (buffer is cleared in that case)
   */
  append(chunk) {
    this._builder.append(chunk);
    if (this._builder.length > this._limit) {
      this._builder.reset();
      return true;
    }
    return false;
  }
  toString() {
    return this._builder.toString();
  }
};

// src/common/buffer/BufferLine.ts
var DEFAULT_ATTR_DATA = Object.freeze(new AttributeData());
var $startIndex = 0;
var $workCell = new CellData();
var $translateToStringBuilder = new StringBuilder();
var BufferLine = class _BufferLine {
  constructor(_stringCache, cols, fillCellData, isWrapped = false) {
    this._stringCache = _stringCache;
    this.isWrapped = isWrapped;
    /** Sparse cache; only read when `IS_COMBINED_MASK` is set in `_data`. */
    this._combined = {};
    /** Sparse cache; only read when `HAS_EXTENDED` is set in `_data`. */
    this._extendedAttrs = {};
    this._data = new Uint32Array(cols * 3 /* CELL_INDICIES */);
    const cell = fillCellData ?? CellData.fromCharData([0, NULL_CELL_CHAR, NULL_CELL_WIDTH, NULL_CELL_CODE]);
    for (let i = 0; i < cols; ++i) {
      this.setCell(i, cell);
    }
    this.length = cols;
  }
  /**
   * Get cell data CharData.
   * @deprecated
   */
  get(index) {
    const content = this._data[index * 3 /* CELL_INDICIES */ + 0 /* CONTENT */];
    const cp = content & 2097151 /* CODEPOINT_MASK */;
    return [
      this._data[index * 3 /* CELL_INDICIES */ + 1 /* FG */],
      content & 2097152 /* IS_COMBINED_MASK */ ? this._combined[index] : cp ? stringFromCodePoint(cp) : "",
      content >> 22 /* WIDTH_SHIFT */,
      content & 2097152 /* IS_COMBINED_MASK */ ? this._combined[index].charCodeAt(this._combined[index].length - 1) : cp
    ];
  }
  /**
   * Set cell data from CharData.
   * @deprecated
   */
  set(index, value) {
    this._invalidateStringCache();
    this._data[index * 3 /* CELL_INDICIES */ + 1 /* FG */] = value[CHAR_DATA_ATTR_INDEX];
    if (value[CHAR_DATA_CHAR_INDEX].length > 1) {
      this._combined[index] = value[1];
      this._data[index * 3 /* CELL_INDICIES */ + 0 /* CONTENT */] = index | 2097152 /* IS_COMBINED_MASK */ | value[CHAR_DATA_WIDTH_INDEX] << 22 /* WIDTH_SHIFT */;
    } else {
      this._data[index * 3 /* CELL_INDICIES */ + 0 /* CONTENT */] = value[CHAR_DATA_CHAR_INDEX].charCodeAt(0) | value[CHAR_DATA_WIDTH_INDEX] << 22 /* WIDTH_SHIFT */;
    }
  }
  /**
   * primitive getters
   * use these when only one value is needed, otherwise use `loadCell`
   */
  getWidth(index) {
    return this._data[index * 3 /* CELL_INDICIES */ + 0 /* CONTENT */] >> 22 /* WIDTH_SHIFT */;
  }
  /** Test whether content has width. */
  hasWidth(index) {
    return this._data[index * 3 /* CELL_INDICIES */ + 0 /* CONTENT */] & 12582912 /* WIDTH_MASK */;
  }
  /** Get FG cell component. */
  getFg(index) {
    return this._data[index * 3 /* CELL_INDICIES */ + 1 /* FG */];
  }
  /** Get BG cell component. */
  getBg(index) {
    return this._data[index * 3 /* CELL_INDICIES */ + 2 /* BG */];
  }
  /**
   * Test whether contains any chars.
   * Basically an empty has no content, but other cells might differ in FG/BG
   * from real empty cells.
   */
  hasContent(index) {
    return this._data[index * 3 /* CELL_INDICIES */ + 0 /* CONTENT */] & 4194303 /* HAS_CONTENT_MASK */;
  }
  /**
   * Get codepoint of the cell.
   * To be in line with `code` in CharData this either returns
   * a single UTF32 codepoint or the last codepoint of a combined string.
   */
  getCodePoint(index) {
    const content = this._data[index * 3 /* CELL_INDICIES */ + 0 /* CONTENT */];
    if (content & 2097152 /* IS_COMBINED_MASK */) {
      return this._combined[index].charCodeAt(this._combined[index].length - 1);
    }
    return content & 2097151 /* CODEPOINT_MASK */;
  }
  /** Test whether the cell contains a combined string. */
  isCombined(index) {
    return this._data[index * 3 /* CELL_INDICIES */ + 0 /* CONTENT */] & 2097152 /* IS_COMBINED_MASK */;
  }
  /** Returns the string content of the cell. */
  getString(index) {
    const content = this._data[index * 3 /* CELL_INDICIES */ + 0 /* CONTENT */];
    if (content & 2097152 /* IS_COMBINED_MASK */) {
      return this._combined[index];
    }
    if (content & 2097151 /* CODEPOINT_MASK */) {
      return stringFromCodePoint(content & 2097151 /* CODEPOINT_MASK */);
    }
    return "";
  }
  /** Get state of protected flag. */
  isProtected(index) {
    return this._data[index * 3 /* CELL_INDICIES */ + 2 /* BG */] & 536870912 /* PROTECTED */;
  }
  /**
   * Load data at `index` into `cell`. This is used to access cells in a way that's more friendly
   * to GC as it significantly reduced the amount of new objects/references needed.
   */
  loadCell(index, cell) {
    $startIndex = index * 3 /* CELL_INDICIES */;
    cell.content = this._data[$startIndex + 0 /* CONTENT */];
    cell.fg = this._data[$startIndex + 1 /* FG */];
    cell.bg = this._data[$startIndex + 2 /* BG */];
    if (cell.content & 2097152 /* IS_COMBINED_MASK */) {
      cell.combinedData = this._combined[index];
    } else {
      cell.combinedData = "";
    }
    if (cell.bg & 268435456 /* HAS_EXTENDED */) {
      cell.extended = this._extendedAttrs[index];
    } else {
      cell.extended = DEFAULT_ATTR_DATA.extended.clone();
    }
    return cell;
  }
  /**
   * Set data at `index` to `cell`.
   */
  setCell(index, cell) {
    this._invalidateStringCache();
    if (cell.content & 2097152 /* IS_COMBINED_MASK */) {
      this._combined[index] = cell.combinedData;
    }
    if (cell.bg & 268435456 /* HAS_EXTENDED */) {
      this._extendedAttrs[index] = cell.extended;
    }
    this._data[index * 3 /* CELL_INDICIES */ + 0 /* CONTENT */] = cell.content;
    this._data[index * 3 /* CELL_INDICIES */ + 1 /* FG */] = cell.fg;
    this._data[index * 3 /* CELL_INDICIES */ + 2 /* BG */] = cell.bg;
  }
  /**
   * Set cell data from input handler.
   * Since the input handler see the incoming chars as UTF32 codepoints,
   * it gets an optimized access method.
   */
  setCellFromCodepoint(index, codePoint, width, attrs) {
    this._invalidateStringCache();
    if (attrs.bg & 268435456 /* HAS_EXTENDED */) {
      this._extendedAttrs[index] = attrs.extended;
    }
    this._data[index * 3 /* CELL_INDICIES */ + 0 /* CONTENT */] = codePoint | width << 22 /* WIDTH_SHIFT */;
    this._data[index * 3 /* CELL_INDICIES */ + 1 /* FG */] = attrs.fg;
    this._data[index * 3 /* CELL_INDICIES */ + 2 /* BG */] = attrs.bg;
  }
  /**
   * Add a codepoint to a cell from input handler.
   * During input stage combining chars with a width of 0 follow and stack
   * onto a leading char. Since we already set the attrs
   * by the previous `setDataFromCodePoint` call, we can omit it here.
   */
  addCodepointToCell(index, codePoint, width) {
    this._invalidateStringCache();
    let content = this._data[index * 3 /* CELL_INDICIES */ + 0 /* CONTENT */];
    if (content & 2097152 /* IS_COMBINED_MASK */) {
      this._combined[index] += stringFromCodePoint(codePoint);
    } else {
      if (content & 2097151 /* CODEPOINT_MASK */) {
        this._combined[index] = stringFromCodePoint(content & 2097151 /* CODEPOINT_MASK */) + stringFromCodePoint(codePoint);
        content &= ~2097151 /* CODEPOINT_MASK */;
        content |= 2097152 /* IS_COMBINED_MASK */;
      } else {
        content = codePoint | 1 << 22 /* WIDTH_SHIFT */;
      }
    }
    if (width) {
      content &= ~12582912 /* WIDTH_MASK */;
      content |= width << 22 /* WIDTH_SHIFT */;
    }
    this._data[index * 3 /* CELL_INDICIES */ + 0 /* CONTENT */] = content;
  }
  insertCells(pos, n, fillCellData) {
    this._invalidateStringCache();
    pos %= this.length;
    if (pos && this.getWidth(pos - 1) === 2) {
      this.setCellFromCodepoint(pos - 1, 0, 1, fillCellData);
    }
    if (n < this.length - pos) {
      for (let i = this.length - pos - n - 1; i >= 0; --i) {
        this.setCell(pos + n + i, this.loadCell(pos + i, $workCell));
      }
      for (let i = 0; i < n; ++i) {
        this.setCell(pos + i, fillCellData);
      }
    } else {
      for (let i = pos; i < this.length; ++i) {
        this.setCell(i, fillCellData);
      }
    }
    if (this.getWidth(this.length - 1) === 2) {
      this.setCellFromCodepoint(this.length - 1, 0, 1, fillCellData);
    }
  }
  deleteCells(pos, n, fillCellData) {
    this._invalidateStringCache();
    pos %= this.length;
    if (n < this.length - pos) {
      for (let i = 0; i < this.length - pos - n; ++i) {
        this.setCell(pos + i, this.loadCell(pos + n + i, $workCell));
      }
      for (let i = this.length - n; i < this.length; ++i) {
        this.setCell(i, fillCellData);
      }
    } else {
      for (let i = pos; i < this.length; ++i) {
        this.setCell(i, fillCellData);
      }
    }
    if (pos && this.getWidth(pos - 1) === 2) {
      this.setCellFromCodepoint(pos - 1, 0, 1, fillCellData);
    }
    if (this.getWidth(pos) === 0 && !this.hasContent(pos)) {
      this.setCellFromCodepoint(pos, 0, 1, fillCellData);
    }
  }
  replaceCells(start, end, fillCellData, respectProtect = false) {
    this._invalidateStringCache();
    if (respectProtect) {
      if (start && this.getWidth(start - 1) === 2 && !this.isProtected(start - 1)) {
        this.setCellFromCodepoint(start - 1, 0, 1, fillCellData);
      }
      if (end < this.length && this.getWidth(end - 1) === 2 && !this.isProtected(end)) {
        this.setCellFromCodepoint(end, 0, 1, fillCellData);
      }
      while (start < end && start < this.length) {
        if (!this.isProtected(start)) {
          this.setCell(start, fillCellData);
        }
        start++;
      }
      return;
    }
    if (start && this.getWidth(start - 1) === 2) {
      this.setCellFromCodepoint(start - 1, 0, 1, fillCellData);
    }
    if (end < this.length && this.getWidth(end - 1) === 2) {
      this.setCellFromCodepoint(end, 0, 1, fillCellData);
    }
    while (start < end && start < this.length) {
      this.setCell(start++, fillCellData);
    }
  }
  /**
   * Resize BufferLine to `cols` filling excess cells with `fillCellData`.
   * The underlying array buffer will not change if there is still enough space
   * to hold the new buffer line data.
   * Returns a boolean indicating, whether a `cleanupMemory` call would free
   * excess memory (true after shrinking > Constants.CLEANUP_THRESHOLD).
   */
  resize(cols, fillCellData) {
    this._invalidateStringCache();
    if (cols === this.length) {
      return this._data.length * 4 * 2 /* CLEANUP_THRESHOLD */ < this._data.buffer.byteLength;
    }
    const uint32Cells = cols * 3 /* CELL_INDICIES */;
    if (cols > this.length) {
      if (this._data.buffer.byteLength >= uint32Cells * 4) {
        this._data = new Uint32Array(this._data.buffer, 0, uint32Cells);
      } else {
        const data = new Uint32Array(uint32Cells);
        data.set(this._data);
        this._data = data;
      }
      for (let i = this.length; i < cols; ++i) {
        this.setCell(i, fillCellData);
      }
    } else {
      this._data = this._data.subarray(0, uint32Cells);
      const keys = Object.keys(this._combined);
      for (let i = 0; i < keys.length; i++) {
        const key = parseInt(keys[i], 10);
        if (key >= cols) {
          delete this._combined[key];
        }
      }
      const extKeys = Object.keys(this._extendedAttrs);
      for (let i = 0; i < extKeys.length; i++) {
        const key = parseInt(extKeys[i], 10);
        if (key >= cols) {
          delete this._extendedAttrs[key];
        }
      }
    }
    this.length = cols;
    return uint32Cells * 4 * 2 /* CLEANUP_THRESHOLD */ < this._data.buffer.byteLength;
  }
  /**
   * Cleanup underlying array buffer.
   * A cleanup will be triggered if the array buffer exceeds the actual used
   * memory by a factor of Constants.CLEANUP_THRESHOLD.
   * Returns 0 or 1 indicating whether a cleanup happened.
   */
  cleanupMemory() {
    if (this._data.length * 4 * 2 /* CLEANUP_THRESHOLD */ < this._data.buffer.byteLength) {
      const data = new Uint32Array(this._data.length);
      data.set(this._data);
      this._data = data;
      return 1;
    }
    return 0;
  }
  /** fill a line with fillCharData */
  fill(fillCellData, respectProtect = false) {
    this._invalidateStringCache();
    if (respectProtect) {
      for (let i = 0; i < this.length; ++i) {
        if (!this.isProtected(i)) {
          this.setCell(i, fillCellData);
        }
      }
      return;
    }
    this._combined = {};
    this._extendedAttrs = {};
    for (let i = 0; i < this.length; ++i) {
      this.setCell(i, fillCellData);
    }
  }
  /** alter to a full copy of line  */
  copyFrom(line) {
    this._invalidateStringCache();
    if (this.length !== line.length) {
      this._data = new Uint32Array(line._data);
    } else {
      this._data.set(line._data);
    }
    this.length = line.length;
    this._copySparseMapsFrom(line);
    this.isWrapped = line.isWrapped;
  }
  /** create a new clone */
  clone() {
    const newLine = new _BufferLine(this._stringCache, 0, void 0, false);
    newLine._data = new Uint32Array(this._data);
    newLine.length = this.length;
    newLine._copySparseMapsFrom(this);
    newLine.isWrapped = this.isWrapped;
    return newLine;
  }
  getTrimmedLength() {
    for (let i = this.length - 1; i >= 0; --i) {
      if (this._data[i * 3 /* CELL_INDICIES */ + 0 /* CONTENT */] & 4194303 /* HAS_CONTENT_MASK */) {
        return i + (this._data[i * 3 /* CELL_INDICIES */ + 0 /* CONTENT */] >> 22 /* WIDTH_SHIFT */);
      }
    }
    return 0;
  }
  getNoBgTrimmedLength() {
    for (let i = this.length - 1; i >= 0; --i) {
      if (this._data[i * 3 /* CELL_INDICIES */ + 0 /* CONTENT */] & 4194303 /* HAS_CONTENT_MASK */ || this._data[i * 3 /* CELL_INDICIES */ + 2 /* BG */] & 50331648 /* CM_MASK */) {
        return i + (this._data[i * 3 /* CELL_INDICIES */ + 0 /* CONTENT */] >> 22 /* WIDTH_SHIFT */);
      }
    }
    return 0;
  }
  copyCellsFrom(src, srcCol, destCol, length, applyInReverse) {
    this._invalidateStringCache();
    const srcData = src._data;
    if (applyInReverse) {
      for (let cell = length - 1; cell >= 0; cell--) {
        for (let i = 0; i < 3 /* CELL_INDICIES */; i++) {
          this._data[(destCol + cell) * 3 /* CELL_INDICIES */ + i] = srcData[(srcCol + cell) * 3 /* CELL_INDICIES */ + i];
        }
        this._copyCellMapsFrom(src, srcCol + cell, destCol + cell);
      }
    } else {
      for (let cell = 0; cell < length; cell++) {
        for (let i = 0; i < 3 /* CELL_INDICIES */; i++) {
          this._data[(destCol + cell) * 3 /* CELL_INDICIES */ + i] = srcData[(srcCol + cell) * 3 /* CELL_INDICIES */ + i];
        }
        this._copyCellMapsFrom(src, srcCol + cell, destCol + cell);
      }
    }
  }
  /**
   * Translates the buffer line to a string. Caching only applies to canonical full-line translation
   * requests (regardless of `trimRight` value).
   *
   * @param trimRight Whether to trim any empty cells on the right.
   * @param startCol The column to start the string (0-based inclusive).
   * @param endCol The column to end the string (0-based exclusive).
   * @param outColumns if specified, this array will be filled with column numbers such that
   * `returnedString[i]` is displayed at `outColumns[i]` column. `outColumns[returnedString.length]`
   * is where the character following `returnedString` will be displayed.
   *
   * When a single cell is translated to multiple UTF-16 code units (e.g. surrogate pair) in the
   * returned string, the corresponding entries in `outColumns` will have the same column number.
   */
  translateToString(trimRight, startCol, endCol, outColumns) {
    const isCanonicalRequest = (startCol === void 0 || startCol === 0) && endCol === void 0 && outColumns === void 0;
    if (isCanonicalRequest) {
      this._stringCache.touch?.();
    }
    const stringCacheEntry = isCanonicalRequest ? this._getStringCacheEntry(false) : void 0;
    if (isCanonicalRequest && stringCacheEntry?.value !== void 0) {
      if (trimRight) {
        return stringCacheEntry.isTrimmed ? stringCacheEntry.value : stringCacheEntry.value.trimEnd();
      }
      if (!stringCacheEntry.isTrimmed) {
        return stringCacheEntry.value;
      }
    }
    startCol = startCol ?? 0;
    endCol = endCol ?? this.length;
    if (trimRight) {
      endCol = Math.min(endCol, this.getTrimmedLength());
    }
    if (outColumns) {
      outColumns.length = 0;
    }
    $translateToStringBuilder.reset();
    while (startCol < endCol) {
      const content = this._data[startCol * 3 /* CELL_INDICIES */ + 0 /* CONTENT */];
      const cp = content & 2097151 /* CODEPOINT_MASK */;
      const chars = content & 2097152 /* IS_COMBINED_MASK */ ? this._combined[startCol] : cp ? stringFromCodePoint(cp) : WHITESPACE_CELL_CHAR;
      $translateToStringBuilder.append(chars);
      if (outColumns) {
        for (let i = 0; i < chars.length; ++i) {
          outColumns.push(startCol);
        }
      }
      startCol += content >> 22 /* WIDTH_SHIFT */ || 1;
    }
    if (outColumns) {
      outColumns.push(startCol);
    }
    const result = $translateToStringBuilder.toString();
    $translateToStringBuilder.reset();
    if (isCanonicalRequest) {
      const cacheEntry = this._getStringCacheEntry(true);
      cacheEntry.value = result;
      cacheEntry.isTrimmed = !!trimRight;
    }
    return result;
  }
  _getStringCacheEntry(createIfNeeded) {
    const cachedEntry = this._stringCacheEntryRef?.deref();
    if (cachedEntry) {
      if (cachedEntry.generation === this._stringCache.generation) {
        return cachedEntry;
      }
    }
    if (!createIfNeeded) {
      return void 0;
    }
    const cacheEntry = this._stringCache.allocateEntry();
    this._stringCacheEntryRef = new WeakRef(cacheEntry);
    return cacheEntry;
  }
  _invalidateStringCache() {
    const cacheEntry = this._getStringCacheEntry(false);
    if (cacheEntry) {
      cacheEntry.value = void 0;
      cacheEntry.isTrimmed = false;
    }
  }
  /** Copy sparse map entries for a single cell when `_data` flags require them. */
  _copyCellMapsFrom(src, srcCol, destCol) {
    const srcStart = srcCol * 3 /* CELL_INDICIES */;
    if (src._data[srcStart + 0 /* CONTENT */] & 2097152 /* IS_COMBINED_MASK */) {
      this._combined[destCol] = src._combined[srcCol];
    }
    if (src._data[srcStart + 2 /* BG */] & 268435456 /* HAS_EXTENDED */) {
      this._extendedAttrs[destCol] = src._extendedAttrs[srcCol];
    }
  }
  /** Rebuild sparse maps from another line, keyed only by `_data` flags. */
  _copySparseMapsFrom(line) {
    this._combined = {};
    this._extendedAttrs = {};
    for (let i = 0; i < line.length; i++) {
      this._copyCellMapsFrom(line, i, i);
    }
  }
};

// src/common/services/ServiceRegistry.ts
var serviceRegistry = /* @__PURE__ */ new Map();
function getServiceDependencies(ctor) {
  return ctor["di$dependencies" /* DI_DEPENDENCIES */] || [];
}
function createDecorator(id) {
  if (serviceRegistry.has(id)) {
    return serviceRegistry.get(id);
  }
  const decorator = function(target, key, index) {
    if (arguments.length !== 3) {
      throw new Error("@IServiceName-decorator can only be used to decorate a parameter");
    }
    storeServiceDependency(decorator, target, index);
  };
  decorator._id = id;
  serviceRegistry.set(id, decorator);
  return decorator;
}
function storeServiceDependency(id, target, index) {
  if (target["di$target" /* DI_TARGET */] === target) {
    target["di$dependencies" /* DI_DEPENDENCIES */].push({ id, index });
  } else {
    target["di$dependencies" /* DI_DEPENDENCIES */] = [{ id, index }];
    target["di$target" /* DI_TARGET */] = target;
  }
}

// src/common/services/Services.ts
var IBufferService = createDecorator("BufferService");
var IMouseStateService = createDecorator("MouseStateService");
var ICoreService = createDecorator("CoreService");
var ICharsetService = createDecorator("CharsetService");
var IInstantiationService = createDecorator("InstantiationService");
var ILogService = createDecorator("LogService");
var IOptionsService = createDecorator("OptionsService");
var IOscLinkService = createDecorator("OscLinkService");
var IUnicodeService = createDecorator("UnicodeService");
var IDecorationService = createDecorator("DecorationService");

// src/common/services/InstantiationService.ts
var ServiceCollection = class {
  constructor(...entries) {
    this._entries = /* @__PURE__ */ new Map();
    for (const [id, service] of entries) {
      this.set(id, service);
    }
  }
  set(id, instance) {
    const result = this._entries.get(id);
    this._entries.set(id, instance);
    return result;
  }
  forEach(callback) {
    for (const [key, value] of this._entries.entries()) {
      callback(key, value);
    }
  }
  has(id) {
    return this._entries.has(id);
  }
  get(id) {
    return this._entries.get(id);
  }
};
var InstantiationService = class {
  constructor() {
    this._services = new ServiceCollection();
    this._services.set(IInstantiationService, this);
  }
  setService(id, instance) {
    this._services.set(id, instance);
  }
  getService(id) {
    return this._services.get(id);
  }
  createInstance(ctor, ...args) {
    const serviceDependencies = getServiceDependencies(ctor).sort((a, b) => a.index - b.index);
    const serviceArgs = [];
    for (const dependency of serviceDependencies) {
      const service = this._services.get(dependency.id);
      if (!service) {
        throw new Error(`[createInstance] ${ctor.name} depends on UNKNOWN service ${dependency.id._id}.`);
      }
      serviceArgs.push(service);
    }
    const firstServiceArgPos = serviceDependencies.length > 0 ? serviceDependencies[0].index : args.length;
    if (args.length !== firstServiceArgPos) {
      throw new Error(`[createInstance] First service dependency of ${ctor.name} at position ${firstServiceArgPos + 1} conflicts with ${args.length} static arguments`);
    }
    return new ctor(...[...args, ...serviceArgs]);
  }
};

// src/common/services/LogService.ts
var optionsKeyToLogLevel = {
  trace: 0 /* TRACE */,
  debug: 1 /* DEBUG */,
  info: 2 /* INFO */,
  warn: 3 /* WARN */,
  error: 4 /* ERROR */,
  off: 5 /* OFF */
};
var LOG_PREFIX = "xterm.js: ";
var LogService = class extends Disposable {
  constructor(_optionsService) {
    super();
    this._optionsService = _optionsService;
    this._logLevel = 5 /* OFF */;
    this._updateLogLevel();
    this._register(this._optionsService.onSpecificOptionChange("logLevel", () => this._updateLogLevel()));
  }
  get logLevel() {
    return this._logLevel;
  }
  _updateLogLevel() {
    this._logLevel = optionsKeyToLogLevel[this._optionsService.rawOptions.logLevel];
  }
  _evalLazyOptionalParams(optionalParams) {
    for (let i = 0; i < optionalParams.length; i++) {
      if (typeof optionalParams[i] === "function") {
        optionalParams[i] = optionalParams[i]();
      }
    }
  }
  _log(type, message, optionalParams) {
    this._evalLazyOptionalParams(optionalParams);
    type.call(console, (this._optionsService.options.logger ? "" : LOG_PREFIX) + message, ...optionalParams);
  }
  trace(message, ...optionalParams) {
    if (this._logLevel <= 0 /* TRACE */) {
      this._log(this._optionsService.options.logger?.trace.bind(this._optionsService.options.logger) ?? console.log, message, optionalParams);
    }
  }
  debug(message, ...optionalParams) {
    if (this._logLevel <= 1 /* DEBUG */) {
      this._log(this._optionsService.options.logger?.debug.bind(this._optionsService.options.logger) ?? console.log, message, optionalParams);
    }
  }
  info(message, ...optionalParams) {
    if (this._logLevel <= 2 /* INFO */) {
      this._log(this._optionsService.options.logger?.info.bind(this._optionsService.options.logger) ?? console.info, message, optionalParams);
    }
  }
  warn(message, ...optionalParams) {
    if (this._logLevel <= 3 /* WARN */) {
      this._log(this._optionsService.options.logger?.warn.bind(this._optionsService.options.logger) ?? console.warn, message, optionalParams);
    }
  }
  error(message, ...optionalParams) {
    if (this._logLevel <= 4 /* ERROR */) {
      this._log(this._optionsService.options.logger?.error.bind(this._optionsService.options.logger) ?? console.error, message, optionalParams);
    }
  }
};
LogService = __decorateClass([
  __decorateParam(0, IOptionsService)
], LogService);

// src/common/CircularList.ts
var CircularList = class extends Disposable {
  constructor(_maxLength) {
    super();
    this._maxLength = _maxLength;
    this.onDeleteEmitter = this._register(new Emitter());
    this.onDelete = this.onDeleteEmitter.event;
    this.onInsertEmitter = this._register(new Emitter());
    this.onInsert = this.onInsertEmitter.event;
    this.onTrimEmitter = this._register(new Emitter());
    this.onTrim = this.onTrimEmitter.event;
    this._array = new Array(this._maxLength);
    this._startIndex = 0;
    this._length = 0;
  }
  get maxLength() {
    return this._maxLength;
  }
  set maxLength(newMaxLength) {
    if (this._maxLength === newMaxLength) {
      return;
    }
    const newArray = new Array(newMaxLength);
    for (let i = 0; i < Math.min(newMaxLength, this.length); i++) {
      newArray[i] = this._array[this._getCyclicIndex(i)];
    }
    this._array = newArray;
    this._maxLength = newMaxLength;
    this._startIndex = 0;
  }
  get length() {
    return this._length;
  }
  set length(newLength) {
    if (newLength > this._length) {
      for (let i = this._length; i < newLength; i++) {
        this._array[i] = void 0;
      }
    }
    this._length = newLength;
  }
  /**
   * Gets the value at an index.
   *
   * Note that for performance reasons there is no bounds checking here, the index reference is
   * circular so this should always return a value and never throw.
   * @param index The index of the value to get.
   * @returns The value corresponding to the index.
   */
  get(index) {
    return this._array[this._getCyclicIndex(index)];
  }
  /**
   * Sets the value at an index.
   *
   * Note that for performance reasons there is no bounds checking here, the index reference is
   * circular so this should always return a value and never throw.
   * @param index The index to set.
   * @param value The value to set.
   */
  set(index, value) {
    this._array[this._getCyclicIndex(index)] = value;
  }
  /**
   * Pushes a new value onto the list, wrapping around to the start of the array, overriding index 0
   * if the maximum length is reached.
   * @param value The value to push onto the list.
   */
  push(value) {
    this._array[this._getCyclicIndex(this._length)] = value;
    if (this._length === this._maxLength) {
      this._startIndex = ++this._startIndex % this._maxLength;
      this.onTrimEmitter.fire(1);
    } else {
      this._length++;
    }
  }
  /**
   * Advance ringbuffer index and return current element for recycling.
   * Note: The buffer must be full for this method to work.
   * @throws When the buffer is not full.
   */
  recycle() {
    if (this._length !== this._maxLength) {
      throw new Error("Can only recycle when the buffer is full");
    }
    this._startIndex = ++this._startIndex % this._maxLength;
    this.onTrimEmitter.fire(1);
    return this._array[this._getCyclicIndex(this._length - 1)];
  }
  /**
   * Ringbuffer is at max length.
   */
  get isFull() {
    return this._length === this._maxLength;
  }
  /**
   * Removes and returns the last value on the list.
   * @returns The popped value.
   */
  pop() {
    return this._array[this._getCyclicIndex(this._length-- - 1)];
  }
  /**
   * Deletes and/or inserts items at a particular index (in that order). Unlike
   * Array.prototype.splice, this operation does not return the deleted items as a new array in
   * order to save creating a new array. Note that this operation may shift all values in the list
   * in the worst case.
   * @param start The index to delete and/or insert.
   * @param deleteCount The number of elements to delete.
   * @param items The items to insert.
   */
  splice(start, deleteCount, ...items) {
    if (deleteCount) {
      for (let i = start; i < this._length - deleteCount; i++) {
        this._array[this._getCyclicIndex(i)] = this._array[this._getCyclicIndex(i + deleteCount)];
      }
      this._length -= deleteCount;
      this.onDeleteEmitter.fire({ index: start, amount: deleteCount });
    }
    for (let i = this._length - 1; i >= start; i--) {
      this._array[this._getCyclicIndex(i + items.length)] = this._array[this._getCyclicIndex(i)];
    }
    for (let i = 0; i < items.length; i++) {
      this._array[this._getCyclicIndex(start + i)] = items[i];
    }
    if (items.length) {
      this.onInsertEmitter.fire({ index: start, amount: items.length });
    }
    if (this._length + items.length > this._maxLength) {
      const countToTrim = this._length + items.length - this._maxLength;
      this._startIndex += countToTrim;
      this._length = this._maxLength;
      this.onTrimEmitter.fire(countToTrim);
    } else {
      this._length += items.length;
    }
  }
  /**
   * Trims a number of items from the start of the list.
   * @param count The number of items to remove.
   */
  trimStart(count) {
    if (count > this._length) {
      count = this._length;
    }
    this._startIndex += count;
    this._length -= count;
    this.onTrimEmitter.fire(count);
  }
  shiftElements(start, count, offset) {
    if (count <= 0) {
      return;
    }
    if (start < 0 || start >= this._length) {
      throw new Error("start argument out of range");
    }
    if (start + offset < 0) {
      throw new Error("Cannot shift elements in list beyond index 0");
    }
    if (offset > 0) {
      for (let i = count - 1; i >= 0; i--) {
        this.set(start + i + offset, this.get(start + i));
      }
      const expandListBy = start + count + offset - this._length;
      if (expandListBy > 0) {
        this._length += expandListBy;
        while (this._length > this._maxLength) {
          this._length--;
          this._startIndex++;
          this.onTrimEmitter.fire(1);
        }
      }
    } else {
      for (let i = 0; i < count; i++) {
        this.set(start + i + offset, this.get(start + i));
      }
    }
  }
  /**
   * Gets the cyclic index for the specified regular index. The cyclic index can then be used on the
   * backing array to get the element associated with the regular index.
   * @param index The regular index.
   * @returns The cyclic index.
   */
  _getCyclicIndex(index) {
    return (this._startIndex + index) % this._maxLength;
  }
};

// src/common/TaskQueue.ts
var TaskQueue = class {
  constructor(logService) {
    this._tasks = [];
    this._i = 0;
    this._logService = logService;
  }
  enqueue(task) {
    this._tasks.push(task);
    this._start();
  }
  flush() {
    while (this._i < this._tasks.length) {
      if (!this._tasks[this._i]()) {
        this._i++;
      }
    }
    this.clear();
  }
  clear() {
    if (this._idleCallback) {
      this._cancelCallback(this._idleCallback);
      this._idleCallback = void 0;
    }
    this._i = 0;
    this._tasks.length = 0;
  }
  _start() {
    if (!this._idleCallback) {
      this._idleCallback = this._requestCallback(this._process.bind(this));
    }
  }
  _process(deadline) {
    this._idleCallback = void 0;
    let taskDuration;
    let longestTask = 0;
    let lastDeadlineRemaining = deadline.timeRemaining();
    let deadlineRemaining;
    while (this._i < this._tasks.length) {
      taskDuration = performance.now();
      if (!this._tasks[this._i]()) {
        this._i++;
      }
      taskDuration = Math.max(1, performance.now() - taskDuration);
      longestTask = Math.max(taskDuration, longestTask);
      deadlineRemaining = deadline.timeRemaining();
      if (longestTask * 1.5 > deadlineRemaining) {
        if (lastDeadlineRemaining - taskDuration < -20) {
          this._logService.warn(`task queue exceeded allotted deadline by ${Math.abs(Math.round(lastDeadlineRemaining - taskDuration))}ms`);
        }
        this._start();
        return;
      }
      lastDeadlineRemaining = deadlineRemaining;
    }
    this.clear();
  }
};
var PriorityTaskQueue = class extends TaskQueue {
  _requestCallback(callback) {
    return setTimeout(() => callback(this._createDeadline(16)));
  }
  _cancelCallback(identifier) {
    clearTimeout(identifier);
  }
  _createDeadline(duration) {
    const end = performance.now() + duration;
    return {
      timeRemaining: () => Math.max(0, end - performance.now())
    };
  }
};
var IdleTaskQueueInternal = class extends TaskQueue {
  _requestCallback(callback) {
    return requestIdleCallback(callback);
  }
  _cancelCallback(identifier) {
    cancelIdleCallback(identifier);
  }
};
var IdleTaskQueue = "requestIdleCallback" in globalThis ? IdleTaskQueueInternal : PriorityTaskQueue;

// src/common/Async.ts
function disposableTimeout(handler, timeout = 0, store) {
  const timer = setTimeout(() => {
    handler();
    if (store) {
      disposable.dispose();
    }
  }, timeout);
  const disposable = toDisposable(() => {
    clearTimeout(timer);
  });
  store?.add(disposable);
  return disposable;
}
var TimeoutTimer = class {
  constructor() {
    this._token = -1;
    this._isDisposed = false;
  }
  dispose() {
    this.cancel();
    this._isDisposed = true;
  }
  cancel() {
    if (this._token !== -1) {
      clearTimeout(this._token);
      this._token = -1;
    }
  }
  cancelAndSet(runner, timeout) {
    if (this._isDisposed) {
      throw new Error("Calling cancelAndSet on a disposed TimeoutTimer");
    }
    this.cancel();
    this._token = setTimeout(() => {
      this._token = -1;
      runner();
    }, timeout);
  }
  setIfNotSet(runner, timeout) {
    if (this._isDisposed) {
      throw new Error("Calling setIfNotSet on a disposed TimeoutTimer");
    }
    if (this._token !== -1) {
      return;
    }
    this._token = setTimeout(() => {
      this._token = -1;
      runner();
    }, timeout);
  }
};

// src/common/buffer/BufferLineStringCache.ts
var BufferLineStringCache = class extends Disposable {
  constructor() {
    super();
    this.generation = 0;
    this.entries = /* @__PURE__ */ new Set();
    this._clearTimeout = this._register(new MutableDisposable());
    this._lastAccessTimestamp = 0;
    this._register(toDisposable(() => this.entries.clear()));
  }
  touch() {
    this._scheduleClear();
  }
  allocateEntry() {
    const entry = {
      value: void 0,
      isTrimmed: false,
      generation: this.generation
    };
    this.entries.add(entry);
    this._scheduleClear();
    return entry;
  }
  clear() {
    this._clearTimeout.clear();
    this._lastAccessTimestamp = 0;
    this.generation++;
    for (const entry of this.entries) {
      entry.value = void 0;
      entry.isTrimmed = false;
    }
    this.entries.clear();
  }
  _scheduleClear() {
    this._lastAccessTimestamp = Date.now();
    if (this._clearTimeout.value) {
      return;
    }
    this._scheduleClearTimeout(15e3 /* CACHE_TTL_MS */);
  }
  _scheduleClearTimeout(timeoutMs) {
    this._clearTimeout.value = disposableTimeout(() => {
      const elapsed = Date.now() - this._lastAccessTimestamp;
      if (elapsed >= 15e3 /* CACHE_TTL_MS */) {
        this.clear();
        return;
      }
      this._scheduleClearTimeout(15e3 /* CACHE_TTL_MS */ - elapsed);
    }, timeoutMs);
  }
};

// src/common/buffer/BufferReflow.ts
function reflowLargerGetLinesToRemove(lines, oldCols, newCols, bufferAbsoluteY, nullCell, reflowCursorLine) {
  const toRemove = [];
  for (let y = 0; y < lines.length - 1; y++) {
    let i = y;
    let nextLine = lines.get(++i);
    if (!nextLine.isWrapped) {
      continue;
    }
    const wrappedLines = [lines.get(y)];
    while (i < lines.length && nextLine.isWrapped) {
      wrappedLines.push(nextLine);
      nextLine = lines.get(++i);
    }
    if (!reflowCursorLine) {
      if (bufferAbsoluteY >= y && bufferAbsoluteY < i) {
        y += wrappedLines.length - 1;
        continue;
      }
    }
    let destLineIndex = 0;
    let destCol = getWrappedLineTrimmedLength(wrappedLines, destLineIndex, oldCols);
    let srcLineIndex = 1;
    let srcCol = 0;
    while (srcLineIndex < wrappedLines.length) {
      const srcTrimmedTineLength = getWrappedLineTrimmedLength(wrappedLines, srcLineIndex, oldCols);
      const srcRemainingCells = srcTrimmedTineLength - srcCol;
      const destRemainingCells = newCols - destCol;
      const cellsToCopy = Math.min(srcRemainingCells, destRemainingCells);
      wrappedLines[destLineIndex].copyCellsFrom(wrappedLines[srcLineIndex], srcCol, destCol, cellsToCopy, false);
      destCol += cellsToCopy;
      if (destCol === newCols) {
        destLineIndex++;
        destCol = 0;
      }
      srcCol += cellsToCopy;
      if (srcCol === srcTrimmedTineLength) {
        srcLineIndex++;
        srcCol = 0;
      }
      if (destCol === 0 && destLineIndex !== 0) {
        if (wrappedLines[destLineIndex - 1].getWidth(newCols - 1) === 2) {
          wrappedLines[destLineIndex].copyCellsFrom(wrappedLines[destLineIndex - 1], newCols - 1, destCol++, 1, false);
          wrappedLines[destLineIndex - 1].setCell(newCols - 1, nullCell);
        }
      }
    }
    wrappedLines[destLineIndex].replaceCells(destCol, newCols, nullCell);
    let countToRemove = 0;
    for (let i2 = wrappedLines.length - 1; i2 > 0; i2--) {
      if (i2 > destLineIndex || wrappedLines[i2].getTrimmedLength() === 0) {
        countToRemove++;
      } else {
        break;
      }
    }
    if (countToRemove > 0) {
      toRemove.push(y + wrappedLines.length - countToRemove);
      toRemove.push(countToRemove);
    }
    y += wrappedLines.length - 1;
  }
  return toRemove;
}
function reflowLargerCreateNewLayout(lines, toRemove) {
  const layout = [];
  let nextToRemoveIndex = 0;
  let nextToRemoveStart = toRemove[nextToRemoveIndex];
  let countRemovedSoFar = 0;
  for (let i = 0; i < lines.length; i++) {
    if (nextToRemoveStart === i) {
      const countToRemove = toRemove[++nextToRemoveIndex];
      lines.onDeleteEmitter.fire({
        index: i - countRemovedSoFar,
        amount: countToRemove
      });
      i += countToRemove - 1;
      countRemovedSoFar += countToRemove;
      nextToRemoveStart = toRemove[++nextToRemoveIndex];
    } else {
      layout.push(i);
    }
  }
  return {
    layout,
    countRemoved: countRemovedSoFar
  };
}
function reflowLargerApplyNewLayout(lines, newLayout) {
  const newLayoutLines = [];
  for (let i = 0; i < newLayout.length; i++) {
    newLayoutLines.push(lines.get(newLayout[i]));
  }
  for (let i = 0; i < newLayoutLines.length; i++) {
    lines.set(i, newLayoutLines[i]);
  }
  lines.length = newLayout.length;
}
function reflowSmallerGetNewLineLengths(wrappedLines, oldCols, newCols) {
  const newLineLengths = [];
  let cellsNeeded = 0;
  for (let i = 0; i < wrappedLines.length; i++) {
    cellsNeeded += getWrappedLineTrimmedLength(wrappedLines, i, oldCols);
  }
  let srcCol = 0;
  let srcLine = 0;
  let cellsAvailable = 0;
  while (cellsAvailable < cellsNeeded) {
    if (cellsNeeded - cellsAvailable < newCols) {
      newLineLengths.push(cellsNeeded - cellsAvailable);
      break;
    }
    srcCol += newCols;
    const oldTrimmedLength = getWrappedLineTrimmedLength(wrappedLines, srcLine, oldCols);
    if (srcCol > oldTrimmedLength) {
      srcCol -= oldTrimmedLength;
      srcLine++;
    }
    const endsWithWide = wrappedLines[srcLine].getWidth(srcCol - 1) === 2;
    if (endsWithWide) {
      srcCol--;
    }
    const lineLength = endsWithWide ? newCols - 1 : newCols;
    newLineLengths.push(lineLength);
    cellsAvailable += lineLength;
  }
  return newLineLengths;
}
function getWrappedLineTrimmedLength(lines, i, cols) {
  if (i === lines.length - 1) {
    return lines[i].getTrimmedLength();
  }
  const endsInNull = !lines[i].hasContent(cols - 1) && lines[i].getWidth(cols - 1) === 1;
  const followingLineStartsWithWide = lines[i + 1].getWidth(0) === 2;
  if (endsInNull && followingLineStartsWithWide) {
    return cols - 1;
  }
  return cols;
}

// src/common/buffer/Marker.ts
var _Marker = class _Marker {
  constructor(line) {
    this.line = line;
    this.isDisposed = false;
    this._disposables = [];
    this._id = _Marker._nextId++;
    this._onDispose = this.register(new Emitter());
    this.onDispose = this._onDispose.event;
  }
  get id() {
    return this._id;
  }
  dispose() {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this.line = -1;
    this._onDispose.fire();
    dispose(this._disposables);
    this._disposables.length = 0;
  }
  register(disposable) {
    this._disposables.push(disposable);
    return disposable;
  }
};
_Marker._nextId = 1;
var Marker = _Marker;

// src/common/data/Charsets.ts
var CHARSETS = {};
var DEFAULT_CHARSET = CHARSETS["B"];
CHARSETS["0"] = {
  "`": "\u25C6",
  // '◆'
  "a": "\u2592",
  // '▒'
  "b": "\u2409",
  // '␉' (HT)
  "c": "\u240C",
  // '␌' (FF)
  "d": "\u240D",
  // '␍' (CR)
  "e": "\u240A",
  // '␊' (LF)
  "f": "\xB0",
  // '°'
  "g": "\xB1",
  // '±'
  "h": "\u2424",
  // '␤' (NL)
  "i": "\u240B",
  // '␋' (VT)
  "j": "\u2518",
  // '┘'
  "k": "\u2510",
  // '┐'
  "l": "\u250C",
  // '┌'
  "m": "\u2514",
  // '└'
  "n": "\u253C",
  // '┼'
  "o": "\u23BA",
  // '⎺'
  "p": "\u23BB",
  // '⎻'
  "q": "\u2500",
  // '─'
  "r": "\u23BC",
  // '⎼'
  "s": "\u23BD",
  // '⎽'
  "t": "\u251C",
  // '├'
  "u": "\u2524",
  // '┤'
  "v": "\u2534",
  // '┴'
  "w": "\u252C",
  // '┬'
  "x": "\u2502",
  // '│'
  "y": "\u2264",
  // '≤'
  "z": "\u2265",
  // '≥'
  "{": "\u03C0",
  // 'π'
  "|": "\u2260",
  // '≠'
  "}": "\xA3",
  // '£'
  "~": "\xB7"
  // '·'
};
CHARSETS["A"] = {
  "#": "\xA3"
};
CHARSETS["B"] = void 0;
CHARSETS["4"] = {
  "#": "\xA3",
  "@": "\xBE",
  "[": "ij",
  "\\": "\xBD",
  "]": "|",
  "{": "\xA8",
  "|": "f",
  "}": "\xBC",
  "~": "\xB4"
};
CHARSETS["C"] = CHARSETS["5"] = {
  "[": "\xC4",
  "\\": "\xD6",
  "]": "\xC5",
  "^": "\xDC",
  "`": "\xE9",
  "{": "\xE4",
  "|": "\xF6",
  "}": "\xE5",
  "~": "\xFC"
};
CHARSETS["R"] = {
  "#": "\xA3",
  "@": "\xE0",
  "[": "\xB0",
  "\\": "\xE7",
  "]": "\xA7",
  "{": "\xE9",
  "|": "\xF9",
  "}": "\xE8",
  "~": "\xA8"
};
CHARSETS["Q"] = {
  "@": "\xE0",
  "[": "\xE2",
  "\\": "\xE7",
  "]": "\xEA",
  "^": "\xEE",
  "`": "\xF4",
  "{": "\xE9",
  "|": "\xF9",
  "}": "\xE8",
  "~": "\xFB"
};
CHARSETS["K"] = {
  "@": "\xA7",
  "[": "\xC4",
  "\\": "\xD6",
  "]": "\xDC",
  "{": "\xE4",
  "|": "\xF6",
  "}": "\xFC",
  "~": "\xDF"
};
CHARSETS["Y"] = {
  "#": "\xA3",
  "@": "\xA7",
  "[": "\xB0",
  "\\": "\xE7",
  "]": "\xE9",
  "`": "\xF9",
  "{": "\xE0",
  "|": "\xF2",
  "}": "\xE8",
  "~": "\xEC"
};
CHARSETS["E"] = CHARSETS["6"] = {
  "@": "\xC4",
  "[": "\xC6",
  "\\": "\xD8",
  "]": "\xC5",
  "^": "\xDC",
  "`": "\xE4",
  "{": "\xE6",
  "|": "\xF8",
  "}": "\xE5",
  "~": "\xFC"
};
CHARSETS["Z"] = {
  "#": "\xA3",
  "@": "\xA7",
  "[": "\xA1",
  "\\": "\xD1",
  "]": "\xBF",
  "{": "\xB0",
  "|": "\xF1",
  "}": "\xE7"
};
CHARSETS["H"] = CHARSETS["7"] = {
  "@": "\xC9",
  "[": "\xC4",
  "\\": "\xD6",
  "]": "\xC5",
  "^": "\xDC",
  "`": "\xE9",
  "{": "\xE4",
  "|": "\xF6",
  "}": "\xE5",
  "~": "\xFC"
};
CHARSETS["="] = {
  "#": "\xF9",
  "@": "\xE0",
  "[": "\xE9",
  "\\": "\xE7",
  "]": "\xEA",
  "^": "\xEE",
  "_": "\xE8",
  "`": "\xF4",
  "{": "\xE4",
  "|": "\xF6",
  "}": "\xFC",
  "~": "\xFB"
};

// src/common/buffer/Buffer.ts
var MAX_BUFFER_SIZE = 4294967295;
var Buffer2 = class extends Disposable {
  constructor(_hasScrollback, _optionsService, _bufferService, _logService) {
    super();
    this._hasScrollback = _hasScrollback;
    this._optionsService = _optionsService;
    this._bufferService = _bufferService;
    this._logService = _logService;
    this.ydisp = 0;
    this.ybase = 0;
    this.y = 0;
    this.x = 0;
    this.tabs = {};
    this.savedY = 0;
    this.savedX = 0;
    this.savedCurAttrData = DEFAULT_ATTR_DATA.clone();
    this.savedCharset = DEFAULT_CHARSET;
    this.savedCharsets = [];
    this.savedGlevel = 0;
    this.savedOriginMode = false;
    this.savedWraparoundMode = true;
    this.markers = [];
    this._nullCell = CellData.fromCharData([0, NULL_CELL_CHAR, NULL_CELL_WIDTH, NULL_CELL_CODE]);
    this._whitespaceCell = CellData.fromCharData([0, WHITESPACE_CELL_CHAR, WHITESPACE_CELL_WIDTH, WHITESPACE_CELL_CODE]);
    this._isClearing = false;
    this._memoryCleanupPosition = 0;
    this._cols = this._bufferService.cols;
    this._rows = this._bufferService.rows;
    this.lines = new CircularList(this._getCorrectBufferLength(this._rows));
    this.scrollTop = 0;
    this.scrollBottom = this._rows - 1;
    this.setupTabStops();
    this._memoryCleanupQueue = new IdleTaskQueue(this._logService);
    this._register(toDisposable(() => this._memoryCleanupQueue.clear()));
    this._register(toDisposable(() => this.clearAllMarkers()));
    this._stringCache = this._register(new BufferLineStringCache());
  }
  getNullCell(attr) {
    if (attr) {
      this._nullCell.fg = attr.fg;
      this._nullCell.bg = attr.bg;
      this._nullCell.extended = attr.extended;
    } else {
      this._nullCell.fg = 0;
      this._nullCell.bg = 0;
      this._nullCell.extended = new ExtendedAttrs();
    }
    return this._nullCell;
  }
  getWhitespaceCell(attr) {
    if (attr) {
      this._whitespaceCell.fg = attr.fg;
      this._whitespaceCell.bg = attr.bg;
      this._whitespaceCell.extended = attr.extended;
    } else {
      this._whitespaceCell.fg = 0;
      this._whitespaceCell.bg = 0;
      this._whitespaceCell.extended = new ExtendedAttrs();
    }
    return this._whitespaceCell;
  }
  getBlankLine(attr, isWrapped) {
    return new BufferLine(this._stringCache, this._bufferService.cols, this.getNullCell(attr), isWrapped);
  }
  get hasScrollback() {
    return this._hasScrollback && this.lines.maxLength > this._rows;
  }
  get isCursorInViewport() {
    const absoluteY = this.ybase + this.y;
    const relativeY = absoluteY - this.ydisp;
    return relativeY >= 0 && relativeY < this._rows;
  }
  /**
   * Gets the correct buffer length based on the rows provided, the terminal's
   * scrollback and whether this buffer is flagged to have scrollback or not.
   * @param rows The terminal rows to use in the calculation.
   */
  _getCorrectBufferLength(rows) {
    if (!this._hasScrollback) {
      return rows;
    }
    const correctBufferLength = rows + this._optionsService.rawOptions.scrollback;
    return correctBufferLength > MAX_BUFFER_SIZE ? MAX_BUFFER_SIZE : correctBufferLength;
  }
  /**
   * Fills the buffer's viewport with blank lines.
   */
  fillViewportRows(fillAttr) {
    if (this.lines.length === 0) {
      fillAttr ??= DEFAULT_ATTR_DATA;
      let i = this._rows;
      while (i--) {
        this.lines.push(this.getBlankLine(fillAttr));
      }
    }
  }
  /**
   * Clears the buffer to its initial state, discarding all previous data.
   */
  clear() {
    this._stringCache.clear();
    this.ydisp = 0;
    this.ybase = 0;
    this.y = 0;
    this.x = 0;
    this.lines = new CircularList(this._getCorrectBufferLength(this._rows));
    this.scrollTop = 0;
    this.scrollBottom = this._rows - 1;
    this.setupTabStops();
  }
  /**
   * Resizes the buffer, adjusting its data accordingly.
   * @param newCols The new number of columns.
   * @param newRows The new number of rows.
   */
  resize(newCols, newRows) {
    const nullCell = this.getNullCell(DEFAULT_ATTR_DATA);
    this._stringCache.clear();
    let dirtyMemoryLines = 0;
    const newMaxLength = this._getCorrectBufferLength(newRows);
    if (newMaxLength > this.lines.maxLength) {
      this.lines.maxLength = newMaxLength;
    }
    if (this.lines.length > 0) {
      if (this._cols < newCols) {
        for (let i = 0; i < this.lines.length; i++) {
          dirtyMemoryLines += +this.lines.get(i).resize(newCols, nullCell);
        }
      }
      let addToY = 0;
      if (this._rows < newRows) {
        for (let y = this._rows; y < newRows; y++) {
          if (this.lines.length < newRows + this.ybase) {
            if (this._optionsService.rawOptions.windowsPty.backend !== void 0 || this._optionsService.rawOptions.windowsPty.buildNumber !== void 0) {
              this.lines.push(new BufferLine(this._stringCache, newCols, nullCell, false));
            } else {
              if (this.ybase > 0 && this.lines.length <= this.ybase + this.y + addToY + 1) {
                this.ybase--;
                addToY++;
                if (this.ydisp > 0) {
                  this.ydisp--;
                }
              } else {
                this.lines.push(new BufferLine(this._stringCache, newCols, nullCell, false));
              }
            }
          }
        }
      } else {
        for (let y = this._rows; y > newRows; y--) {
          if (this.lines.length > newRows + this.ybase) {
            if (this.lines.length > this.ybase + this.y + 1) {
              this.lines.pop();
            } else {
              this.ybase++;
              this.ydisp++;
            }
          }
        }
      }
      if (newMaxLength < this.lines.maxLength) {
        const amountToTrim = this.lines.length - newMaxLength;
        if (amountToTrim > 0) {
          this.lines.trimStart(amountToTrim);
          this.ybase = Math.max(this.ybase - amountToTrim, 0);
          this.ydisp = Math.max(this.ydisp - amountToTrim, 0);
          this.savedY = Math.max(this.savedY - amountToTrim, 0);
        }
        this.lines.maxLength = newMaxLength;
      }
      this.x = Math.min(this.x, newCols - 1);
      this.y = Math.min(this.y, newRows - 1);
      if (addToY) {
        this.y += addToY;
      }
      this.savedX = Math.min(this.savedX, newCols - 1);
      this.scrollTop = 0;
    }
    this.scrollBottom = newRows - 1;
    if (this._isReflowEnabled) {
      this._reflow(newCols, newRows);
      if (this._cols > newCols) {
        for (let i = 0; i < this.lines.length; i++) {
          dirtyMemoryLines += +this.lines.get(i).resize(newCols, nullCell);
        }
      }
    }
    this._cols = newCols;
    this._rows = newRows;
    if (this.lines.length > 0) {
      const maxY = Math.max(0, this.lines.length - this.ybase - 1);
      this.y = Math.min(this.y, maxY);
    }
    this._memoryCleanupQueue.clear();
    if (dirtyMemoryLines > 0.1 * this.lines.length) {
      this._memoryCleanupPosition = 0;
      this._memoryCleanupQueue.enqueue(() => this._batchedMemoryCleanup());
    }
  }
  _batchedMemoryCleanup() {
    let normalRun = true;
    if (this._memoryCleanupPosition >= this.lines.length) {
      this._memoryCleanupPosition = 0;
      normalRun = false;
    }
    let counted = 0;
    while (this._memoryCleanupPosition < this.lines.length) {
      counted += this.lines.get(this._memoryCleanupPosition++).cleanupMemory();
      if (counted > 100) {
        return true;
      }
    }
    return normalRun;
  }
  get _isReflowEnabled() {
    const windowsPty = this._optionsService.rawOptions.windowsPty;
    if (windowsPty && windowsPty.buildNumber) {
      return this._hasScrollback && windowsPty.backend === "conpty" && windowsPty.buildNumber >= 21376;
    }
    return this._hasScrollback;
  }
  _reflow(newCols, newRows) {
    if (this._cols === newCols) {
      return;
    }
    if (newCols > this._cols) {
      this._reflowLarger(newCols, newRows);
    } else {
      this._reflowSmaller(newCols, newRows);
    }
  }
  _reflowLarger(newCols, newRows) {
    const reflowCursorLine = this._optionsService.rawOptions.reflowCursorLine;
    const toRemove = reflowLargerGetLinesToRemove(this.lines, this._cols, newCols, this.ybase + this.y, this.getNullCell(DEFAULT_ATTR_DATA), reflowCursorLine);
    if (toRemove.length > 0) {
      const newLayoutResult = reflowLargerCreateNewLayout(this.lines, toRemove);
      reflowLargerApplyNewLayout(this.lines, newLayoutResult.layout);
      this._reflowLargerAdjustViewport(newCols, newRows, newLayoutResult.countRemoved);
    }
  }
  _reflowLargerAdjustViewport(newCols, newRows, countRemoved) {
    const nullCell = this.getNullCell(DEFAULT_ATTR_DATA);
    let viewportAdjustments = countRemoved;
    while (viewportAdjustments-- > 0) {
      if (this.ybase === 0) {
        if (this.y > 0) {
          this.y--;
        }
        if (this.lines.length < newRows) {
          this.lines.push(new BufferLine(this._stringCache, newCols, nullCell, false));
        }
      } else {
        if (this.ydisp === this.ybase) {
          this.ydisp--;
        }
        this.ybase--;
      }
    }
    this.savedY = Math.max(this.savedY - countRemoved, 0);
  }
  _reflowSmaller(newCols, newRows) {
    const reflowCursorLine = this._optionsService.rawOptions.reflowCursorLine;
    const nullCell = this.getNullCell(DEFAULT_ATTR_DATA);
    const toInsert = [];
    let countToInsert = 0;
    for (let y = this.lines.length - 1; y >= 0; y--) {
      let nextLine = this.lines.get(y);
      if (!nextLine || !nextLine.isWrapped && nextLine.getTrimmedLength() <= newCols) {
        continue;
      }
      const wrappedLines = [nextLine];
      while (nextLine.isWrapped && y > 0) {
        nextLine = this.lines.get(--y);
        wrappedLines.unshift(nextLine);
      }
      if (!reflowCursorLine) {
        const absoluteY = this.ybase + this.y;
        if (absoluteY >= y && absoluteY < y + wrappedLines.length) {
          continue;
        }
      }
      const lastLineLength = wrappedLines[wrappedLines.length - 1].getTrimmedLength();
      const destLineLengths = reflowSmallerGetNewLineLengths(wrappedLines, this._cols, newCols);
      const linesToAdd = destLineLengths.length - wrappedLines.length;
      let trimmedLines;
      if (this.ybase === 0 && this.y !== this.lines.length - 1) {
        trimmedLines = Math.max(0, this.y - this.lines.maxLength + linesToAdd);
      } else {
        trimmedLines = Math.max(0, this.lines.length - this.lines.maxLength + linesToAdd);
      }
      const newLines = [];
      for (let i = 0; i < linesToAdd; i++) {
        const newLine = this.getBlankLine(DEFAULT_ATTR_DATA, true);
        newLines.push(newLine);
      }
      if (newLines.length > 0) {
        toInsert.push({
          // countToInsert here gets the actual index, taking into account other inserted items.
          // using this we can iterate through the list forwards
          start: y + wrappedLines.length + countToInsert,
          newLines
        });
        countToInsert += newLines.length;
      }
      wrappedLines.push(...newLines);
      let destLineIndex = destLineLengths.length - 1;
      let destCol = destLineLengths[destLineIndex];
      if (destCol === 0) {
        destLineIndex--;
        destCol = destLineLengths[destLineIndex];
      }
      let srcLineIndex = wrappedLines.length - linesToAdd - 1;
      let srcCol = lastLineLength;
      while (srcLineIndex >= 0) {
        const cellsToCopy = Math.min(srcCol, destCol);
        if (wrappedLines[destLineIndex] === void 0) {
          break;
        }
        wrappedLines[destLineIndex].copyCellsFrom(wrappedLines[srcLineIndex], srcCol - cellsToCopy, destCol - cellsToCopy, cellsToCopy, true);
        destCol -= cellsToCopy;
        if (destCol === 0) {
          destLineIndex--;
          destCol = destLineLengths[destLineIndex];
        }
        srcCol -= cellsToCopy;
        if (srcCol === 0) {
          srcLineIndex--;
          const wrappedLinesIndex = Math.max(srcLineIndex, 0);
          srcCol = getWrappedLineTrimmedLength(wrappedLines, wrappedLinesIndex, this._cols);
        }
      }
      for (let i = 0; i < wrappedLines.length; i++) {
        if (destLineLengths[i] < newCols) {
          wrappedLines[i].setCell(destLineLengths[i], nullCell);
        }
      }
      let viewportAdjustments = linesToAdd - trimmedLines;
      while (viewportAdjustments-- > 0) {
        if (this.ybase === 0) {
          if (this.y < newRows - 1) {
            this.y++;
            this.lines.pop();
          } else {
            this.ybase++;
            this.ydisp++;
          }
        } else {
          if (this.ybase < Math.min(this.lines.maxLength, this.lines.length + countToInsert) - newRows) {
            if (this.ybase === this.ydisp) {
              this.ydisp++;
            }
            this.ybase++;
          }
        }
      }
      this.savedY = Math.min(this.savedY + linesToAdd, this.ybase + newRows - 1);
    }
    if (toInsert.length > 0) {
      const insertEvents = [];
      const originalLines = [];
      for (let i = 0; i < this.lines.length; i++) {
        originalLines.push(this.lines.get(i));
      }
      const originalLinesLength = this.lines.length;
      let originalLineIndex = originalLinesLength - 1;
      let nextToInsertIndex = 0;
      let nextToInsert = toInsert[nextToInsertIndex];
      this.lines.length = Math.min(this.lines.maxLength, this.lines.length + countToInsert);
      let countInsertedSoFar = 0;
      for (let i = Math.min(this.lines.maxLength - 1, originalLinesLength + countToInsert - 1); i >= 0; i--) {
        if (nextToInsert && nextToInsert.start > originalLineIndex + countInsertedSoFar) {
          for (let nextI = nextToInsert.newLines.length - 1; nextI >= 0; nextI--) {
            this.lines.set(i--, nextToInsert.newLines[nextI]);
          }
          i++;
          insertEvents.push({
            index: originalLineIndex + 1,
            amount: nextToInsert.newLines.length
          });
          countInsertedSoFar += nextToInsert.newLines.length;
          nextToInsert = toInsert[++nextToInsertIndex];
        } else {
          this.lines.set(i, originalLines[originalLineIndex--]);
        }
      }
      let insertCountEmitted = 0;
      for (let i = insertEvents.length - 1; i >= 0; i--) {
        insertEvents[i].index += insertCountEmitted;
        this.lines.onInsertEmitter.fire(insertEvents[i]);
        insertCountEmitted += insertEvents[i].amount;
      }
      const amountToTrim = Math.max(0, originalLinesLength + countToInsert - this.lines.maxLength);
      if (amountToTrim > 0) {
        this.lines.onTrimEmitter.fire(amountToTrim);
      }
    }
  }
  /**
   * Translates a buffer line to a string, with optional start and end columns.
   * Wide characters will count as two columns in the resulting string. This
   * function is useful for getting the actual text underneath the raw selection
   * position.
   * @param lineIndex The absolute index of the line being translated.
   * @param trimRight Whether to trim whitespace to the right.
   * @param startCol The column to start at.
   * @param endCol The column to end at.
   */
  translateBufferLineToString(lineIndex, trimRight, startCol = 0, endCol) {
    const line = this.lines.get(lineIndex);
    if (!line) {
      return "";
    }
    return line.translateToString(trimRight, startCol, endCol);
  }
  getWrappedRangeForLine(y) {
    let first = y;
    let last = y;
    while (first > 0 && this.lines.get(first).isWrapped) {
      first--;
    }
    while (last + 1 < this.lines.length && this.lines.get(last + 1).isWrapped) {
      last++;
    }
    return { first, last };
  }
  /**
   * Setup the tab stops.
   * @param i The index to start setting up tab stops from.
   */
  setupTabStops(i) {
    if (i !== null && i !== void 0) {
      if (!this.tabs[i]) {
        i = this.prevStop(i);
      }
    } else {
      this.tabs = {};
      i = 0;
    }
    for (; i < this._cols; i += this._optionsService.rawOptions.tabStopWidth) {
      this.tabs[i] = true;
    }
  }
  /**
   * Move the cursor to the previous tab stop from the given position (default is current).
   * @param x The position to move the cursor to the previous tab stop.
   */
  prevStop(x) {
    x ??= this.x;
    while (!this.tabs[--x] && x > 0) ;
    return x >= this._cols ? this._cols - 1 : x < 0 ? 0 : x;
  }
  /**
   * Move the cursor one tab stop forward from the given position (default is current).
   * @param x The position to move the cursor one tab stop forward.
   */
  nextStop(x) {
    x ??= this.x;
    while (!this.tabs[++x] && x < this._cols) ;
    return x >= this._cols ? this._cols - 1 : x < 0 ? 0 : x;
  }
  /**
   * Clears markers on single line.
   * @param y The line to clear.
   */
  clearMarkers(y) {
    this._isClearing = true;
    for (let i = 0; i < this.markers.length; i++) {
      if (this.markers[i].line === y) {
        this.markers[i].dispose();
        this.markers.splice(i--, 1);
      }
    }
    this._isClearing = false;
  }
  /**
   * Clears markers on all lines
   */
  clearAllMarkers() {
    this._isClearing = true;
    for (let i = 0; i < this.markers.length; i++) {
      this.markers[i].dispose();
    }
    this.markers.length = 0;
    this._isClearing = false;
  }
  addMarker(y) {
    const marker = new Marker(y);
    this.markers.push(marker);
    marker.register(this.lines.onTrim((amount) => {
      marker.line -= amount;
      if (marker.line < 0) {
        marker.dispose();
      }
    }));
    marker.register(this.lines.onInsert((event) => {
      if (marker.line >= event.index) {
        marker.line += event.amount;
      }
    }));
    marker.register(this.lines.onDelete((event) => {
      if (marker.line >= event.index && marker.line < event.index + event.amount) {
        marker.dispose();
      }
      if (marker.line > event.index) {
        marker.line -= event.amount;
      }
    }));
    marker.register(marker.onDispose(() => this._removeMarker(marker)));
    return marker;
  }
  _removeMarker(marker) {
    if (!this._isClearing) {
      this.markers.splice(this.markers.indexOf(marker), 1);
    }
  }
};

// src/common/buffer/BufferSet.ts
var BufferSet = class extends Disposable {
  /**
   * Create a new BufferSet for the given terminal.
   */
  constructor(_optionsService, _bufferService, _logService) {
    super();
    this._optionsService = _optionsService;
    this._bufferService = _bufferService;
    this._logService = _logService;
    this._normalBuffer = this._register(new MutableDisposable());
    this._altBuffer = this._register(new MutableDisposable());
    this._onBufferActivate = this._register(new Emitter());
    this.onBufferActivate = this._onBufferActivate.event;
    this.reset();
    this._register(this._optionsService.onSpecificOptionChange("scrollback", () => this.resize(this._bufferService.cols, this._bufferService.rows)));
    this._register(this._optionsService.onSpecificOptionChange("tabStopWidth", () => this.setupTabStops()));
  }
  reset() {
    this._normal = new Buffer2(true, this._optionsService, this._bufferService, this._logService);
    this._normalBuffer.value = this._normal;
    this._normal.fillViewportRows();
    this._alt = new Buffer2(false, this._optionsService, this._bufferService, this._logService);
    this._altBuffer.value = this._alt;
    this._activeBuffer = this._normal;
    this._onBufferActivate.fire({
      activeBuffer: this._normal,
      inactiveBuffer: this._alt
    });
    this.setupTabStops();
  }
  /**
   * Returns the alt Buffer of the BufferSet
   */
  get alt() {
    return this._alt;
  }
  /**
   * Returns the currently active Buffer of the BufferSet
   */
  get active() {
    return this._activeBuffer;
  }
  /**
   * Returns the normal Buffer of the BufferSet
   */
  get normal() {
    return this._normal;
  }
  /**
   * Sets the normal Buffer of the BufferSet as its currently active Buffer
   */
  activateNormalBuffer() {
    if (this._activeBuffer === this._normal) {
      return;
    }
    this._normal.x = this._alt.x;
    this._normal.y = this._alt.y;
    this._alt.clearAllMarkers();
    this._alt.clear();
    this._activeBuffer = this._normal;
    this._onBufferActivate.fire({
      activeBuffer: this._normal,
      inactiveBuffer: this._alt
    });
  }
  /**
   * Sets the alt Buffer of the BufferSet as its currently active Buffer
   */
  activateAltBuffer(fillAttr) {
    if (this._activeBuffer === this._alt) {
      return;
    }
    this._alt.fillViewportRows(fillAttr);
    this._alt.x = this._normal.x;
    this._alt.y = this._normal.y;
    this._activeBuffer = this._alt;
    this._onBufferActivate.fire({
      activeBuffer: this._alt,
      inactiveBuffer: this._normal
    });
  }
  /**
   * Resizes both normal and alt buffers, adjusting their data accordingly.
   * @param newCols The new number of columns.
   * @param newRows The new number of rows.
   */
  resize(newCols, newRows) {
    this._normal.resize(newCols, newRows);
    this._alt.resize(newCols, newRows);
    this.setupTabStops(newCols);
  }
  /**
   * Setup the tab stops.
   * @param i The index to start setting up tab stops from.
   */
  setupTabStops(i) {
    this._normal.setupTabStops(i);
    this._alt.setupTabStops(i);
  }
};

// src/common/services/BufferService.ts
var BufferService = class extends Disposable {
  constructor(optionsService, logService) {
    super();
    /** Whether the user is scrolling (locks the scroll position) */
    this.isUserScrolling = false;
    this._onResize = this._register(new Emitter());
    this.onResize = this._onResize.event;
    this._onScroll = this._register(new Emitter());
    this.onScroll = this._onScroll.event;
    this.cols = Math.max(optionsService.rawOptions.cols || 0, 2 /* MINIMUM_COLS */);
    this.rows = Math.max(optionsService.rawOptions.rows || 0, 1 /* MINIMUM_ROWS */);
    this.buffers = this._register(new BufferSet(optionsService, this, logService));
    this._register(this.buffers.onBufferActivate((e) => {
      this._onScroll.fire(e.activeBuffer.ydisp);
    }));
  }
  get buffer() {
    return this.buffers.active;
  }
  resize(cols, rows) {
    const colsChanged = this.cols !== cols;
    const rowsChanged = this.rows !== rows;
    this.cols = cols;
    this.rows = rows;
    this.buffers.resize(cols, rows);
    this._onResize.fire({ cols, rows, colsChanged, rowsChanged });
  }
  reset() {
    this.buffers.reset();
    this.isUserScrolling = false;
  }
  /**
   * Scroll the terminal down 1 row, creating a blank line.
   * @param eraseAttr The attribute data to use the for blank line.
   * @param isWrapped Whether the new line is wrapped from the previous line.
   */
  scroll(eraseAttr, isWrapped = false) {
    const buffer = this.buffer;
    let newLine;
    newLine = this._cachedBlankLine;
    if (!newLine || newLine.length !== this.cols || newLine.getFg(0) !== eraseAttr.fg || newLine.getBg(0) !== eraseAttr.bg) {
      newLine = buffer.getBlankLine(eraseAttr, isWrapped);
      this._cachedBlankLine = newLine;
    }
    newLine.isWrapped = isWrapped;
    const topRow = buffer.ybase + buffer.scrollTop;
    const bottomRow = buffer.ybase + buffer.scrollBottom;
    if (buffer.scrollTop === 0) {
      const willBufferBeTrimmed = buffer.lines.isFull;
      if (bottomRow === buffer.lines.length - 1) {
        if (willBufferBeTrimmed) {
          buffer.lines.recycle().copyFrom(newLine);
        } else {
          buffer.lines.push(newLine.clone());
        }
      } else {
        buffer.lines.splice(bottomRow + 1, 0, newLine.clone());
      }
      if (!willBufferBeTrimmed) {
        buffer.ybase++;
        if (!this.isUserScrolling) {
          buffer.ydisp++;
        }
      } else {
        if (this.isUserScrolling) {
          buffer.ydisp = Math.max(buffer.ydisp - 1, 0);
        }
      }
    } else {
      const scrollRegionHeight = bottomRow - topRow + 1;
      buffer.lines.shiftElements(topRow + 1, scrollRegionHeight - 1, -1);
      buffer.lines.set(bottomRow, newLine.clone());
    }
    if (!this.isUserScrolling) {
      buffer.ydisp = buffer.ybase;
    }
    this._onScroll.fire(buffer.ydisp);
  }
  /**
   * Scroll the display of the terminal
   * @param disp The number of lines to scroll down (negative scroll up).
   * @param suppressScrollEvent Don't emit the scroll event as scrollLines. This is used
   * to avoid unwanted events being handled by the viewport when the event was triggered from the
   * viewport originally.
   */
  scrollLines(disp, suppressScrollEvent) {
    const buffer = this.buffer;
    if (disp < 0) {
      if (buffer.ydisp === 0) {
        return;
      }
      this.isUserScrolling = true;
    } else if (disp + buffer.ydisp >= buffer.ybase) {
      this.isUserScrolling = false;
    }
    const oldYdisp = buffer.ydisp;
    buffer.ydisp = Math.max(Math.min(buffer.ydisp + disp, buffer.ybase), 0);
    if (oldYdisp === buffer.ydisp) {
      return;
    }
    if (!suppressScrollEvent) {
      this._onScroll.fire(buffer.ydisp);
    }
  }
};
BufferService = __decorateClass([
  __decorateParam(0, IOptionsService),
  __decorateParam(1, ILogService)
], BufferService);

// src/common/Platform.ts
var isNode = typeof process !== "undefined" && "title" in process && (typeof navigator === "undefined" || navigator.userAgent.startsWith("Node.js/")) ? true : false;
var userAgent = isNode ? "node" : navigator.userAgent;
var platform = isNode ? "node" : navigator.platform;
var isFirefox = userAgent.includes("Firefox");
var isChrome = userAgent.includes("Chrome");
var isLegacyEdge = userAgent.includes("Edge");
var isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
var isMac = ["Macintosh", "MacIntel", "MacPPC", "Mac68K"].includes(platform);
var isWindows = ["Windows", "Win16", "Win32", "WinCE"].includes(platform);
var isLinux = platform.indexOf("Linux") >= 0;
var isChromeOS = /\bCrOS\b/.test(userAgent);

// src/common/services/OptionsService.ts
var DEFAULT_OPTIONS = {
  cols: 80,
  rows: 24,
  showCursorImmediately: false,
  cursorBlink: false,
  blinkIntervalDuration: 0,
  cursorStyle: "block",
  cursorWidth: 1,
  cursorInactiveStyle: "outline",
  drawBoldTextInBrightColors: true,
  documentOverride: null,
  fastScrollSensitivity: 5,
  fontFamily: "monospace",
  fontSize: 15,
  fontWeight: "normal",
  fontWeightBold: "bold",
  ignoreBracketedPasteMode: false,
  lineHeight: 1,
  letterSpacing: 0,
  linkHandler: null,
  logLevel: "info",
  logger: null,
  scrollback: 1e3,
  scrollbar: { showScrollbar: true },
  scrollOnEraseInDisplay: false,
  scrollOnUserInput: true,
  scrollSensitivity: 1,
  screenReaderMode: false,
  smoothScrollDuration: 0,
  macOptionIsMeta: false,
  macOptionClickForcesSelection: false,
  minimumContrastRatio: 1,
  mouseEventsRequireAlt: false,
  disableStdin: false,
  allowProposedApi: false,
  allowTransparency: false,
  tabStopWidth: 8,
  theme: {},
  reflowCursorLine: false,
  rescaleOverlappingGlyphs: false,
  rightClickSelectsWord: isMac,
  windowOptions: {},
  windowsPty: {},
  wordSeparator: " ()[]{}',\"`",
  altClickMovesCursor: true,
  convertEol: false,
  termName: "xterm",
  quirks: {},
  vtExtensions: {}
};
var FONT_WEIGHT_OPTIONS = ["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"];
var OptionsService = class extends Disposable {
  constructor(options) {
    super();
    this._onOptionChange = this._register(new Emitter());
    this.onOptionChange = this._onOptionChange.event;
    const defaultOptions = { ...DEFAULT_OPTIONS };
    for (const key in options) {
      if (key in defaultOptions) {
        try {
          const newValue = options[key];
          defaultOptions[key] = this._sanitizeAndValidateOption(key, newValue);
        } catch (e) {
          console.error(e);
        }
      }
    }
    this.rawOptions = defaultOptions;
    this.options = { ...defaultOptions };
    this._setupOptions();
    this._register(toDisposable(() => {
      this.rawOptions.linkHandler = null;
      this.rawOptions.documentOverride = null;
    }));
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  onSpecificOptionChange(key, listener) {
    return this.onOptionChange((eventKey) => {
      if (eventKey === key) {
        listener(this.rawOptions[key]);
      }
    });
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  onMultipleOptionChange(keys, listener) {
    return this.onOptionChange((eventKey) => {
      if (keys.indexOf(eventKey) !== -1) {
        listener();
      }
    });
  }
  _setupOptions() {
    const getter = (propName) => {
      if (!(propName in DEFAULT_OPTIONS)) {
        throw new Error(`No option with key "${propName}"`);
      }
      return this.rawOptions[propName];
    };
    const setter = (propName, value) => {
      if (!(propName in DEFAULT_OPTIONS)) {
        throw new Error(`No option with key "${propName}"`);
      }
      value = this._sanitizeAndValidateOption(propName, value);
      if (this.rawOptions[propName] !== value) {
        this.rawOptions[propName] = value;
        this._onOptionChange.fire(propName);
      }
    };
    for (const propName in this.rawOptions) {
      const desc = {
        get: getter.bind(this, propName),
        set: setter.bind(this, propName)
      };
      Object.defineProperty(this.options, propName, desc);
    }
  }
  _sanitizeAndValidateOption(key, value) {
    switch (key) {
      case "cursorStyle":
        if (!value) {
          value = DEFAULT_OPTIONS[key];
        }
        if (!isCursorStyle(value)) {
          throw new Error(`"${value}" is not a valid value for ${key}`);
        }
        break;
      case "wordSeparator":
        if (!value) {
          value = DEFAULT_OPTIONS[key];
        }
        break;
      case "fontWeight":
      case "fontWeightBold":
        if (typeof value === "number" && 1 <= value && value <= 1e3) {
          break;
        }
        value = FONT_WEIGHT_OPTIONS.includes(value) ? value : DEFAULT_OPTIONS[key];
        break;
      case "blinkIntervalDuration":
        value = Math.floor(value);
        if (value < 0) {
          throw new Error(`${key} cannot be less than 0, value: ${value}`);
        }
        break;
      case "cursorWidth":
        value = Math.floor(value);
      // Fall through for bounds check
      case "lineHeight":
      case "tabStopWidth":
        if (value < 1) {
          throw new Error(`${key} cannot be less than 1, value: ${value}`);
        }
        break;
      case "minimumContrastRatio":
        value = Math.max(1, Math.min(21, Math.round(value * 10) / 10));
        break;
      case "scrollback":
        value = Math.min(value, 4294967295);
        if (value < 0) {
          throw new Error(`${key} cannot be less than 0, value: ${value}`);
        }
        break;
      case "fastScrollSensitivity":
      case "scrollSensitivity":
        if (value <= 0) {
          throw new Error(`${key} cannot be less than or equal to 0, value: ${value}`);
        }
        break;
      case "rows":
      case "cols":
        if (!value && value !== 0) {
          throw new Error(`${key} must be numeric, value: ${value}`);
        }
        break;
      case "windowsPty":
        value = value ?? {};
        break;
    }
    return value;
  }
};
function isCursorStyle(value) {
  return value === "block" || value === "underline" || value === "bar";
}

// src/common/services/CoreService.ts
var DEFAULT_MODES = Object.freeze({
  insertMode: false
});
var DEFAULT_DEC_PRIVATE_MODES = Object.freeze({
  applicationCursorKeys: false,
  applicationKeypad: false,
  bracketedPasteMode: false,
  colorSchemeUpdates: false,
  cursorBlink: void 0,
  cursorStyle: void 0,
  origin: false,
  reverseWraparound: false,
  sendFocus: false,
  synchronizedOutput: false,
  win32InputMode: false,
  wraparound: true
  // defaults: xterm - true, vt100 - false
});
var DEFAULT_KITTY_KEYBOARD_STATE = () => ({
  flags: 0,
  mainFlags: 0,
  altFlags: 0,
  mainStack: [],
  altStack: []
});
var CoreService = class extends Disposable {
  constructor(_bufferService, _logService, _optionsService) {
    super();
    this._bufferService = _bufferService;
    this._logService = _logService;
    this._optionsService = _optionsService;
    this.isCursorHidden = false;
    this._onData = this._register(new Emitter());
    this.onData = this._onData.event;
    this._onUserInput = this._register(new Emitter());
    this.onUserInput = this._onUserInput.event;
    this._onBinary = this._register(new Emitter());
    this.onBinary = this._onBinary.event;
    this._onRequestScrollToBottom = this._register(new Emitter());
    this.onRequestScrollToBottom = this._onRequestScrollToBottom.event;
    this.isCursorInitialized = _optionsService.rawOptions.showCursorImmediately ?? false;
    this.modes = structuredClone(DEFAULT_MODES);
    this.decPrivateModes = structuredClone(DEFAULT_DEC_PRIVATE_MODES);
    this.kittyKeyboard = DEFAULT_KITTY_KEYBOARD_STATE();
  }
  reset() {
    this.modes = structuredClone(DEFAULT_MODES);
    this.decPrivateModes = structuredClone(DEFAULT_DEC_PRIVATE_MODES);
    this.kittyKeyboard = DEFAULT_KITTY_KEYBOARD_STATE();
  }
  triggerDataEvent(data, wasUserInput = false) {
    if (this._optionsService.rawOptions.disableStdin) {
      return;
    }
    const buffer = this._bufferService.buffer;
    if (wasUserInput && this._optionsService.rawOptions.scrollOnUserInput && buffer.ybase !== buffer.ydisp) {
      this._onRequestScrollToBottom.fire();
    }
    if (wasUserInput) {
      this._onUserInput.fire();
    }
    this._logService.debug(`sending data "${data}"`);
    this._logService.trace(`sending data (codes)`, () => data.split("").map((e) => e.charCodeAt(0)));
    this._onData.fire(data);
  }
  triggerBinaryEvent(data) {
    if (this._optionsService.rawOptions.disableStdin) {
      return;
    }
    this._logService.debug(`sending binary "${data}"`);
    this._logService.trace(`sending binary (codes)`, () => data.split("").map((e) => e.charCodeAt(0)));
    this._onBinary.fire(data);
  }
};
CoreService = __decorateClass([
  __decorateParam(0, IBufferService),
  __decorateParam(1, ILogService),
  __decorateParam(2, IOptionsService)
], CoreService);

// src/common/services/MouseStateService.ts
var DEFAULT_PROTOCOLS = {
  /**
   * NONE
   * Events: none
   * Modifiers: none
   */
  NONE: {
    events: 0 /* NONE */,
    restrict: () => false
  },
  /**
   * X10
   * Events: mousedown
   * Modifiers: none
   */
  X10: {
    events: 1 /* DOWN */,
    restrict: (e) => {
      if (e.button === 4 /* WHEEL */ || e.action !== 1 /* DOWN */) {
        return false;
      }
      e.ctrl = false;
      e.alt = false;
      e.shift = false;
      return true;
    }
  },
  /**
   * VT200
   * Events: mousedown / mouseup / wheel
   * Modifiers: all
   */
  VT200: {
    events: 1 /* DOWN */ | 2 /* UP */ | 16 /* WHEEL */,
    restrict: (e) => {
      if (e.action === 32 /* MOVE */) {
        return false;
      }
      return true;
    }
  },
  /**
   * DRAG
   * Events: mousedown / mouseup / wheel / mousedrag
   * Modifiers: all
   */
  DRAG: {
    events: 1 /* DOWN */ | 2 /* UP */ | 16 /* WHEEL */ | 4 /* DRAG */,
    restrict: (e) => {
      if (e.action === 32 /* MOVE */ && e.button === 3 /* NONE */) {
        return false;
      }
      return true;
    }
  },
  /**
   * ANY
   * Events: all mouse related events
   * Modifiers: all
   */
  ANY: {
    events: 1 /* DOWN */ | 2 /* UP */ | 16 /* WHEEL */ | 4 /* DRAG */ | 8 /* MOVE */,
    restrict: (e) => true
  }
};
function eventCode(e, isSGR) {
  let code = (e.ctrl ? 16 /* CTRL */ : 0) | (e.shift ? 4 /* SHIFT */ : 0) | (e.alt ? 8 /* ALT */ : 0);
  if (e.button === 4 /* WHEEL */) {
    code |= 64;
    code |= e.action;
  } else {
    code |= e.button & 3;
    if (e.button & 4) {
      code |= 64;
    }
    if (e.button & 8) {
      code |= 128;
    }
    if (e.action === 32 /* MOVE */) {
      code |= 32 /* MOVE */;
    } else if (e.action === 0 /* UP */ && !isSGR) {
      code |= 3 /* NONE */;
    }
  }
  return code;
}
var S = String.fromCharCode;
var DEFAULT_ENCODINGS = {
  /**
   * DEFAULT - CSI M Pb Px Py
   * Single byte encoding for coords and event code.
   * Can encode values up to 223 (1-based).
   */
  DEFAULT: (e) => {
    const params = [eventCode(e, false) + 32, e.col + 32, e.row + 32];
    if (params[0] > 255 || params[1] > 255 || params[2] > 255) {
      return "";
    }
    return `\x1B[M${S(params[0])}${S(params[1])}${S(params[2])}`;
  },
  /**
   * SGR - CSI < Pb ; Px ; Py M|m
   * No encoding limitation.
   * Can report button on release and works with a well formed sequence.
   */
  SGR: (e) => {
    const final = e.action === 0 /* UP */ && e.button !== 4 /* WHEEL */ ? "m" : "M";
    return `\x1B[<${eventCode(e, true)};${e.col};${e.row}${final}`;
  },
  SGR_PIXELS: (e) => {
    const final = e.action === 0 /* UP */ && e.button !== 4 /* WHEEL */ ? "m" : "M";
    return `\x1B[<${eventCode(e, true)};${e.x};${e.y}${final}`;
  }
};
var MouseStateService = class extends Disposable {
  constructor() {
    super();
    this._protocols = {};
    this._encodings = {};
    this._activeProtocol = "";
    this._activeEncoding = "";
    this._onProtocolChange = this._register(new Emitter());
    this.onProtocolChange = this._onProtocolChange.event;
    for (const name of Object.keys(DEFAULT_PROTOCOLS)) this.addProtocol(name, DEFAULT_PROTOCOLS[name]);
    for (const name of Object.keys(DEFAULT_ENCODINGS)) this.addEncoding(name, DEFAULT_ENCODINGS[name]);
    this.reset();
  }
  addProtocol(name, protocol) {
    this._protocols[name] = protocol;
  }
  addEncoding(name, encoding) {
    this._encodings[name] = encoding;
  }
  get activeProtocol() {
    return this._activeProtocol;
  }
  get areMouseEventsActive() {
    return this._protocols[this._activeProtocol].events !== 0;
  }
  set activeProtocol(name) {
    if (!this._protocols[name]) {
      throw new Error(`unknown protocol "${name}"`);
    }
    this._activeProtocol = name;
    this._onProtocolChange.fire(this._protocols[name].events);
  }
  get activeEncoding() {
    return this._activeEncoding;
  }
  set activeEncoding(name) {
    if (!this._encodings[name]) {
      throw new Error(`unknown encoding "${name}"`);
    }
    this._activeEncoding = name;
  }
  reset() {
    this.activeProtocol = "NONE";
    this.activeEncoding = "DEFAULT";
  }
  setCustomWheelEventHandler(customWheelEventHandler) {
    this._customWheelEventHandler = customWheelEventHandler;
  }
  allowCustomWheelEvent(ev) {
    return this._customWheelEventHandler ? this._customWheelEventHandler(ev) !== false : true;
  }
  restrictMouseEvent(e) {
    return this._protocols[this._activeProtocol].restrict(e);
  }
  encodeMouseEvent(e) {
    return this._encodings[this._activeEncoding](e);
  }
  get isDefaultEncoding() {
    return this._activeEncoding === "DEFAULT";
  }
  get isPixelEncoding() {
    return this._activeEncoding === "SGR_PIXELS";
  }
};

// src/common/services/UnicodeService.ts
var UnicodeService = class _UnicodeService {
  constructor() {
    this._providers = /* @__PURE__ */ Object.create(null);
    this._active = "";
    this._onChange = new Emitter();
    this.onChange = this._onChange.event;
  }
  static extractShouldJoin(value) {
    return (value & 1) !== 0;
  }
  static extractWidth(value) {
    return value >> 1 & 3;
  }
  static extractCharKind(value) {
    return value >> 3;
  }
  static createPropertyValue(state, width, shouldJoin = false) {
    return (state & 16777215) << 3 | (width & 3) << 1 | (shouldJoin ? 1 : 0);
  }
  dispose() {
    this._onChange.dispose();
  }
  get versions() {
    return Object.keys(this._providers);
  }
  get activeVersion() {
    return this._active;
  }
  set activeVersion(version) {
    if (!this._providers[version]) {
      throw new Error(`unknown Unicode version "${version}"`);
    }
    this._active = version;
    this._activeProvider = this._providers[version];
    this._onChange.fire(version);
  }
  register(provider) {
    this._providers[provider.version] = provider;
    if (!this._active) {
      this.activeVersion = provider.version;
    }
  }
  /**
   * Unicode version dependent interface.
   */
  wcwidth(num) {
    return this._activeProvider.wcwidth(num);
  }
  getStringCellWidth(s) {
    let result = 0;
    let precedingInfo = 0;
    const length = s.length;
    for (let i = 0; i < length; ++i) {
      let code = s.charCodeAt(i);
      if (55296 <= code && code <= 56319) {
        if (++i >= length) {
          return result + this.wcwidth(code);
        }
        const second = s.charCodeAt(i);
        if (56320 <= second && second <= 57343) {
          code = (code - 55296) * 1024 + second - 56320 + 65536;
        } else {
          result += this.wcwidth(second);
        }
      }
      const currentInfo = this.charProperties(code, precedingInfo);
      let chWidth = _UnicodeService.extractWidth(currentInfo);
      if (_UnicodeService.extractShouldJoin(currentInfo)) {
        chWidth -= _UnicodeService.extractWidth(precedingInfo);
      }
      result += chWidth;
      precedingInfo = currentInfo;
    }
    return result;
  }
  charProperties(codepoint, preceding) {
    return this._activeProvider.charProperties(codepoint, preceding);
  }
};

// src/common/input/UnicodeV6.ts
var BMP_COMBINING = [
  [768, 879],
  [1155, 1158],
  [1160, 1161],
  [1425, 1469],
  [1471, 1471],
  [1473, 1474],
  [1476, 1477],
  [1479, 1479],
  [1536, 1539],
  [1552, 1557],
  [1611, 1630],
  [1648, 1648],
  [1750, 1764],
  [1767, 1768],
  [1770, 1773],
  [1807, 1807],
  [1809, 1809],
  [1840, 1866],
  [1958, 1968],
  [2027, 2035],
  [2305, 2306],
  [2364, 2364],
  [2369, 2376],
  [2381, 2381],
  [2385, 2388],
  [2402, 2403],
  [2433, 2433],
  [2492, 2492],
  [2497, 2500],
  [2509, 2509],
  [2530, 2531],
  [2561, 2562],
  [2620, 2620],
  [2625, 2626],
  [2631, 2632],
  [2635, 2637],
  [2672, 2673],
  [2689, 2690],
  [2748, 2748],
  [2753, 2757],
  [2759, 2760],
  [2765, 2765],
  [2786, 2787],
  [2817, 2817],
  [2876, 2876],
  [2879, 2879],
  [2881, 2883],
  [2893, 2893],
  [2902, 2902],
  [2946, 2946],
  [3008, 3008],
  [3021, 3021],
  [3134, 3136],
  [3142, 3144],
  [3146, 3149],
  [3157, 3158],
  [3260, 3260],
  [3263, 3263],
  [3270, 3270],
  [3276, 3277],
  [3298, 3299],
  [3393, 3395],
  [3405, 3405],
  [3530, 3530],
  [3538, 3540],
  [3542, 3542],
  [3633, 3633],
  [3636, 3642],
  [3655, 3662],
  [3761, 3761],
  [3764, 3769],
  [3771, 3772],
  [3784, 3789],
  [3864, 3865],
  [3893, 3893],
  [3895, 3895],
  [3897, 3897],
  [3953, 3966],
  [3968, 3972],
  [3974, 3975],
  [3984, 3991],
  [3993, 4028],
  [4038, 4038],
  [4141, 4144],
  [4146, 4146],
  [4150, 4151],
  [4153, 4153],
  [4184, 4185],
  [4448, 4607],
  [4959, 4959],
  [5906, 5908],
  [5938, 5940],
  [5970, 5971],
  [6002, 6003],
  [6068, 6069],
  [6071, 6077],
  [6086, 6086],
  [6089, 6099],
  [6109, 6109],
  [6155, 6157],
  [6313, 6313],
  [6432, 6434],
  [6439, 6440],
  [6450, 6450],
  [6457, 6459],
  [6679, 6680],
  [6912, 6915],
  [6964, 6964],
  [6966, 6970],
  [6972, 6972],
  [6978, 6978],
  [7019, 7027],
  [7616, 7626],
  [7678, 7679],
  [8203, 8207],
  [8234, 8238],
  [8288, 8291],
  [8298, 8303],
  [8400, 8431],
  [12330, 12335],
  [12441, 12442],
  [43014, 43014],
  [43019, 43019],
  [43045, 43046],
  [64286, 64286],
  [65024, 65039],
  [65056, 65059],
  [65279, 65279],
  [65529, 65531]
];
var HIGH_COMBINING = [
  [68097, 68099],
  [68101, 68102],
  [68108, 68111],
  [68152, 68154],
  [68159, 68159],
  [119143, 119145],
  [119155, 119170],
  [119173, 119179],
  [119210, 119213],
  [119362, 119364],
  [917505, 917505],
  [917536, 917631],
  [917760, 917999]
];
var table;
function bisearch(ucs, data) {
  let min = 0;
  let max = data.length - 1;
  let mid;
  if (ucs < data[0][0] || ucs > data[max][1]) {
    return false;
  }
  while (max >= min) {
    mid = min + max >> 1;
    if (ucs > data[mid][1]) {
      min = mid + 1;
    } else if (ucs < data[mid][0]) {
      max = mid - 1;
    } else {
      return true;
    }
  }
  return false;
}
var UnicodeV6 = class {
  constructor() {
    this.version = "6";
    if (!table) {
      table = new Uint8Array(65536);
      table.fill(1);
      table[0] = 0;
      table.fill(0, 1, 32);
      table.fill(0, 127, 160);
      table.fill(2, 4352, 4448);
      table[9001] = 2;
      table[9002] = 2;
      table.fill(2, 11904, 42192);
      table[12351] = 1;
      table.fill(2, 44032, 55204);
      table.fill(2, 63744, 64256);
      table.fill(2, 65040, 65050);
      table.fill(2, 65072, 65136);
      table.fill(2, 65280, 65377);
      table.fill(2, 65504, 65511);
      for (let r = 0; r < BMP_COMBINING.length; ++r) {
        table.fill(0, BMP_COMBINING[r][0], BMP_COMBINING[r][1] + 1);
      }
    }
  }
  wcwidth(num) {
    if (num < 32) return 0;
    if (num < 127) return 1;
    if (num < 65536) return table[num];
    if (bisearch(num, HIGH_COMBINING)) return 0;
    if (num >= 131072 && num <= 196605 || num >= 196608 && num <= 262141) return 2;
    return 1;
  }
  charProperties(codepoint, preceding) {
    let width = this.wcwidth(codepoint);
    let shouldJoin = width === 0 && preceding !== 0;
    if (shouldJoin) {
      const oldWidth = UnicodeService.extractWidth(preceding);
      if (oldWidth === 0) {
        shouldJoin = false;
      } else if (oldWidth > width) {
        width = oldWidth;
      }
    }
    return UnicodeService.createPropertyValue(0, width, shouldJoin);
  }
};

// src/common/services/CharsetService.ts
var CharsetService = class {
  constructor() {
    this.glevel = 0;
    this._charsets = [];
  }
  get charsets() {
    return this._charsets;
  }
  reset() {
    this.charset = void 0;
    this._charsets = [];
    this.glevel = 0;
  }
  setgLevel(g) {
    this.glevel = g;
    this.charset = this._charsets[g];
  }
  setgCharset(g, charset) {
    this._charsets[g] = charset;
    if (this.glevel === g) {
      this.charset = charset;
    }
  }
};

// src/common/WindowsMode.ts
function updateWindowsModeWrappedState(bufferService) {
  const line = bufferService.buffer.lines.get(bufferService.buffer.ybase + bufferService.buffer.y - 1);
  const lastChar = line?.get(bufferService.cols - 1);
  const nextLine = bufferService.buffer.lines.get(bufferService.buffer.ybase + bufferService.buffer.y);
  if (nextLine && lastChar) {
    nextLine.isWrapped = lastChar[CHAR_DATA_CODE_INDEX] !== NULL_CELL_CODE && lastChar[CHAR_DATA_CODE_INDEX] !== WHITESPACE_CELL_CODE;
  }
}

// src/common/parser/Params.ts
var Params = class _Params {
  /**
   * @param maxLength max length of storable parameters
   * @param maxSubParamsLength max length of storable sub parameters
   */
  constructor(maxLength = 32, maxSubParamsLength = 32) {
    this.maxLength = maxLength;
    this.maxSubParamsLength = maxSubParamsLength;
    if (maxSubParamsLength > 256 /* MAX_SUBPARAMS */) {
      throw new Error("maxSubParamsLength must not be greater than 256");
    }
    this.params = new Int32Array(maxLength);
    this.length = 0;
    this._subParams = new Int32Array(maxSubParamsLength);
    this._subParamsLength = 0;
    this._subParamsIdx = new Uint16Array(maxLength);
    this._rejectDigits = false;
    this._rejectSubDigits = false;
    this._digitIsSub = false;
  }
  /**
   * Create a `Params` type from JS array representation.
   */
  static fromArray(values) {
    const params = new _Params();
    if (!values.length) {
      return params;
    }
    for (let i = Array.isArray(values[0]) ? 1 : 0; i < values.length; ++i) {
      const value = values[i];
      if (Array.isArray(value)) {
        for (let k = 0; k < value.length; ++k) {
          params.addSubParam(value[k]);
        }
      } else {
        params.addParam(value);
      }
    }
    return params;
  }
  /**
   * Clone object.
   */
  clone() {
    const newParams = new _Params(this.maxLength, this.maxSubParamsLength);
    newParams.params.set(this.params);
    newParams.length = this.length;
    newParams._subParams.set(this._subParams);
    newParams._subParamsLength = this._subParamsLength;
    newParams._subParamsIdx.set(this._subParamsIdx);
    newParams._rejectDigits = this._rejectDigits;
    newParams._rejectSubDigits = this._rejectSubDigits;
    newParams._digitIsSub = this._digitIsSub;
    return newParams;
  }
  /**
   * Get a JS array representation of the current parameters and sub parameters.
   * The array is structured as follows:
   *    sequence: "1;2:3:4;5::6"
   *    array   : [1, 2, [3, 4], 5, [-1, 6]]
   */
  toArray() {
    const res = [];
    for (let i = 0; i < this.length; ++i) {
      res.push(this.params[i]);
      const start = this._subParamsIdx[i] >> 8;
      const end = this._subParamsIdx[i] & 255;
      if (end - start > 0) {
        res.push(Array.prototype.slice.call(this._subParams, start, end));
      }
    }
    return res;
  }
  /**
   * Reset to initial empty state.
   */
  reset() {
    this.length = 0;
    this._subParamsLength = 0;
    this._rejectDigits = false;
    this._rejectSubDigits = false;
    this._digitIsSub = false;
  }
  /**
   * Reset and add 0 as first param (ZDM).
   */
  resetZdm() {
    this.length = 1;
    this._subParamsLength = 0;
    this._rejectDigits = false;
    this._rejectSubDigits = false;
    this._digitIsSub = false;
    this._subParamsIdx[0] = 0;
    this.params[0] = 0;
  }
  /**
   * Add a parameter value.
   * `Params` only stores up to `maxLength` parameters, any later
   * parameter will be ignored.
   * Note: VT devices only stored up to 16 values, xterm seems to
   * store up to 30.
   */
  addParam(value) {
    this._digitIsSub = false;
    if (this.length >= this.maxLength) {
      this._rejectDigits = true;
      return;
    }
    if (value < -1) {
      throw new Error("values less than -1 are not allowed");
    }
    this._subParamsIdx[this.length] = this._subParamsLength << 8 | this._subParamsLength;
    this.params[this.length++] = value > 2147483647 /* MAX_VALUE */ ? 2147483647 /* MAX_VALUE */ : value;
  }
  /**
   * Add a sub parameter value.
   * The sub parameter is automatically associated with the last parameter value.
   * Thus it is not possible to add a subparameter without any parameter added yet.
   * `Params` only stores up to `maxSubParamsLength` sub parameters, any later
   * sub parameter will be ignored.
   */
  addSubParam(value) {
    this._digitIsSub = true;
    if (!this.length) {
      return;
    }
    if (this._rejectDigits || this._subParamsLength >= this.maxSubParamsLength) {
      this._rejectSubDigits = true;
      return;
    }
    if (value < -1) {
      throw new Error("values less than -1 are not allowed");
    }
    this._subParams[this._subParamsLength++] = value > 2147483647 /* MAX_VALUE */ ? 2147483647 /* MAX_VALUE */ : value;
    this._subParamsIdx[this.length - 1]++;
  }
  /**
   * Whether parameter at index `idx` has sub parameters.
   */
  hasSubParams(idx) {
    return (this._subParamsIdx[idx] & 255) - (this._subParamsIdx[idx] >> 8) > 0;
  }
  /**
   * Return sub parameters for parameter at index `idx`.
   * Note: The values are borrowed, thus you need to copy
   * the values if you need to hold them in nonlocal scope.
   */
  getSubParams(idx) {
    const start = this._subParamsIdx[idx] >> 8;
    const end = this._subParamsIdx[idx] & 255;
    if (end - start > 0) {
      return this._subParams.subarray(start, end);
    }
    return null;
  }
  /**
   * Return all sub parameters as {idx: subparams} mapping.
   * Note: The values are not borrowed.
   */
  getSubParamsAll() {
    const result = {};
    for (let i = 0; i < this.length; ++i) {
      const start = this._subParamsIdx[i] >> 8;
      const end = this._subParamsIdx[i] & 255;
      if (end - start > 0) {
        result[i] = this._subParams.slice(start, end);
      }
    }
    return result;
  }
  /**
   * Add a single digit value to current parameter.
   * This is used by the parser to account digits on a char by char basis.
   */
  addDigit(value) {
    let length;
    if (this._rejectDigits || !(length = this._digitIsSub ? this._subParamsLength : this.length) || this._digitIsSub && this._rejectSubDigits) {
      return;
    }
    const store = this._digitIsSub ? this._subParams : this.params;
    const cur = store[length - 1];
    store[length - 1] = ~cur ? Math.min(cur * 10 + value, 2147483647 /* MAX_VALUE */) : value;
  }
};

// src/common/parser/OscParser.ts
var EMPTY_HANDLERS = [];
var OscParser = class {
  constructor() {
    this._state = 0 /* START */;
    this._active = EMPTY_HANDLERS;
    this._id = -1;
    this._handlers = /* @__PURE__ */ Object.create(null);
    this._handlerFb = () => {
    };
    this._stack = {
      paused: false,
      loopPosition: 0,
      fallThrough: false
    };
  }
  registerHandler(ident, handler) {
    this._handlers[ident] ??= [];
    const handlerList = this._handlers[ident];
    handlerList.push(handler);
    return {
      dispose: () => {
        const handlerIndex = handlerList.indexOf(handler);
        if (handlerIndex !== -1) {
          handlerList.splice(handlerIndex, 1);
        }
      }
    };
  }
  clearHandler(ident) {
    if (this._handlers[ident]) delete this._handlers[ident];
  }
  setHandlerFallback(handler) {
    this._handlerFb = handler;
  }
  dispose() {
    this._handlers = /* @__PURE__ */ Object.create(null);
    this._handlerFb = () => {
    };
    this._active = EMPTY_HANDLERS;
  }
  reset() {
    if (this._state === 2 /* PAYLOAD */) {
      for (let j = this._stack.paused ? this._stack.loopPosition - 1 : this._active.length - 1; j >= 0; --j) {
        this._active[j].end(false);
      }
    }
    this._stack.paused = false;
    this._active = EMPTY_HANDLERS;
    this._id = -1;
    this._state = 0 /* START */;
  }
  _start() {
    this._active = this._handlers[this._id] || EMPTY_HANDLERS;
    if (!this._active.length) {
      this._handlerFb(this._id, "START");
    } else {
      for (let j = this._active.length - 1; j >= 0; j--) {
        this._active[j].start();
      }
    }
  }
  _put(data, start, end) {
    if (!this._active.length) {
      this._handlerFb(this._id, "PUT", utf32ToString(data, start, end));
    } else {
      for (let j = this._active.length - 1; j >= 0; j--) {
        this._active[j].put(data, start, end);
      }
    }
  }
  start() {
    this.reset();
    this._state = 1 /* ID */;
  }
  /**
   * Put data to current OSC command.
   * Expects the identifier of the OSC command in the form
   * OSC id ; payload ST/BEL
   * Payload chunks are not further processed and get
   * directly passed to the handlers.
   */
  put(data, start, end) {
    if (this._state === 3 /* ABORT */) {
      return;
    }
    if (this._state === 1 /* ID */) {
      while (start < end) {
        const code = data[start++];
        if (code === 59) {
          this._state = 2 /* PAYLOAD */;
          this._start();
          break;
        }
        if (code < 48 || 57 < code) {
          this._state = 3 /* ABORT */;
          return;
        }
        if (this._id === -1) {
          this._id = 0;
        }
        this._id = this._id * 10 + code - 48;
      }
    }
    if (this._state === 2 /* PAYLOAD */ && end - start > 0) {
      this._put(data, start, end);
    }
  }
  /**
   * Indicates end of an OSC command.
   * Whether the OSC got aborted or finished normally
   * is indicated by `success`.
   */
  end(success, promiseResult = true) {
    if (this._state === 0 /* START */) {
      return;
    }
    if (this._state !== 3 /* ABORT */) {
      if (this._state === 1 /* ID */) {
        this._start();
      }
      if (!this._active.length) {
        this._handlerFb(this._id, "END", success);
      } else {
        let handlerResult = false;
        let j = this._active.length - 1;
        let fallThrough = false;
        if (this._stack.paused) {
          j = this._stack.loopPosition - 1;
          handlerResult = promiseResult;
          fallThrough = this._stack.fallThrough;
          this._stack.paused = false;
        }
        if (!fallThrough && handlerResult === false) {
          for (; j >= 0; j--) {
            handlerResult = this._active[j].end(success);
            if (handlerResult === true) {
              break;
            } else if (handlerResult instanceof Promise) {
              this._stack.paused = true;
              this._stack.loopPosition = j;
              this._stack.fallThrough = false;
              return handlerResult;
            }
          }
          j--;
        }
        for (; j >= 0; j--) {
          handlerResult = this._active[j].end(false);
          if (handlerResult instanceof Promise) {
            this._stack.paused = true;
            this._stack.loopPosition = j;
            this._stack.fallThrough = true;
            return handlerResult;
          }
        }
      }
    }
    this._active = EMPTY_HANDLERS;
    this._id = -1;
    this._state = 0 /* START */;
  }
};
var _OscHandler = class _OscHandler {
  constructor(_handler) {
    this._handler = _handler;
    this._data = new LimitedStringBuilder(_OscHandler._payloadLimit);
    this._hitLimit = false;
  }
  start() {
    this._data.reset();
    this._hitLimit = false;
  }
  put(data, start, end) {
    if (this._hitLimit) {
      return;
    }
    if (this._data.append(utf32ToString(data, start, end))) {
      this._hitLimit = true;
    }
  }
  end(success) {
    let ret = false;
    if (this._hitLimit) {
      ret = false;
    } else if (success) {
      ret = this._handler(this._data.toString());
      if (ret instanceof Promise) {
        return ret.then((res) => {
          this._data.reset();
          this._hitLimit = false;
          return res;
        });
      }
    }
    this._data.reset();
    this._hitLimit = false;
    return ret;
  }
};
_OscHandler._payloadLimit = 1e7 /* PAYLOAD_LIMIT */;
var OscHandler = _OscHandler;

// src/common/parser/DcsParser.ts
var EMPTY_HANDLERS2 = [];
var DcsParser = class {
  constructor() {
    this._handlers = /* @__PURE__ */ Object.create(null);
    this._active = EMPTY_HANDLERS2;
    this._ident = 0;
    this._handlerFb = () => {
    };
    this._stack = {
      paused: false,
      loopPosition: 0,
      fallThrough: false
    };
  }
  dispose() {
    this._handlers = /* @__PURE__ */ Object.create(null);
    this._handlerFb = () => {
    };
    this._active = EMPTY_HANDLERS2;
  }
  registerHandler(ident, handler) {
    this._handlers[ident] ??= [];
    const handlerList = this._handlers[ident];
    handlerList.push(handler);
    return {
      dispose: () => {
        const handlerIndex = handlerList.indexOf(handler);
        if (handlerIndex !== -1) {
          handlerList.splice(handlerIndex, 1);
        }
      }
    };
  }
  clearHandler(ident) {
    if (this._handlers[ident]) delete this._handlers[ident];
  }
  setHandlerFallback(handler) {
    this._handlerFb = handler;
  }
  reset() {
    if (this._active.length) {
      for (let j = this._stack.paused ? this._stack.loopPosition - 1 : this._active.length - 1; j >= 0; --j) {
        this._active[j].unhook(false);
      }
    }
    this._stack.paused = false;
    this._active = EMPTY_HANDLERS2;
    this._ident = 0;
  }
  hook(ident, params) {
    this.reset();
    this._ident = ident;
    this._active = this._handlers[ident] || EMPTY_HANDLERS2;
    if (!this._active.length) {
      this._handlerFb(this._ident, "HOOK", params);
    } else {
      for (let j = this._active.length - 1; j >= 0; j--) {
        this._active[j].hook(params);
      }
    }
  }
  put(data, start, end) {
    if (!this._active.length) {
      this._handlerFb(this._ident, "PUT", utf32ToString(data, start, end));
    } else {
      for (let j = this._active.length - 1; j >= 0; j--) {
        this._active[j].put(data, start, end);
      }
    }
  }
  unhook(success, promiseResult = true) {
    if (!this._active.length) {
      this._handlerFb(this._ident, "UNHOOK", success);
    } else {
      let handlerResult = false;
      let j = this._active.length - 1;
      let fallThrough = false;
      if (this._stack.paused) {
        j = this._stack.loopPosition - 1;
        handlerResult = promiseResult;
        fallThrough = this._stack.fallThrough;
        this._stack.paused = false;
      }
      if (!fallThrough && handlerResult === false) {
        for (; j >= 0; j--) {
          handlerResult = this._active[j].unhook(success);
          if (handlerResult === true) {
            break;
          } else if (handlerResult instanceof Promise) {
            this._stack.paused = true;
            this._stack.loopPosition = j;
            this._stack.fallThrough = false;
            return handlerResult;
          }
        }
        j--;
      }
      for (; j >= 0; j--) {
        handlerResult = this._active[j].unhook(false);
        if (handlerResult instanceof Promise) {
          this._stack.paused = true;
          this._stack.loopPosition = j;
          this._stack.fallThrough = true;
          return handlerResult;
        }
      }
    }
    this._active = EMPTY_HANDLERS2;
    this._ident = 0;
  }
};
var EMPTY_PARAMS = new Params();
EMPTY_PARAMS.addParam(0);
var _DcsHandler = class _DcsHandler {
  constructor(_handler) {
    this._handler = _handler;
    this._data = new LimitedStringBuilder(_DcsHandler._payloadLimit);
    this._params = EMPTY_PARAMS;
    this._hitLimit = false;
  }
  hook(params) {
    this._params = params.length > 1 || params.params[0] ? params.clone() : EMPTY_PARAMS;
    this._data.reset();
    this._hitLimit = false;
  }
  put(data, start, end) {
    if (this._hitLimit) {
      return;
    }
    if (this._data.append(utf32ToString(data, start, end))) {
      this._hitLimit = true;
    }
  }
  unhook(success) {
    let ret = false;
    if (this._hitLimit) {
      ret = false;
    } else if (success) {
      ret = this._handler(this._data.toString(), this._params);
      if (ret instanceof Promise) {
        return ret.then((res) => {
          this._params = EMPTY_PARAMS;
          this._data.reset();
          this._hitLimit = false;
          return res;
        });
      }
    }
    this._params = EMPTY_PARAMS;
    this._data.reset();
    this._hitLimit = false;
    return ret;
  }
};
_DcsHandler._payloadLimit = 1e7 /* PAYLOAD_LIMIT */;
var DcsHandler = _DcsHandler;

// src/common/parser/ApcParser.ts
var EMPTY_HANDLERS3 = [];
var ApcParser = class {
  constructor() {
    this._handlers = /* @__PURE__ */ Object.create(null);
    this._active = EMPTY_HANDLERS3;
    this._ident = 0;
    this._handlerFb = () => {
    };
    this._stack = {
      paused: false,
      loopPosition: 0,
      fallThrough: false
    };
  }
  /**
   * Register an APC handler for a specific identifier.
   * @param ident The character code of the first byte (e.g., 0x47 for 'G')
   * @param handler The handler to register
   */
  registerHandler(ident, handler) {
    this._handlers[ident] ??= [];
    const handlerList = this._handlers[ident];
    handlerList.push(handler);
    return {
      dispose: () => {
        const handlerIndex = handlerList.indexOf(handler);
        if (handlerIndex !== -1) {
          handlerList.splice(handlerIndex, 1);
        }
      }
    };
  }
  clearHandler(ident) {
    if (this._handlers[ident]) delete this._handlers[ident];
  }
  setHandlerFallback(handler) {
    this._handlerFb = handler;
  }
  dispose() {
    this._handlers = /* @__PURE__ */ Object.create(null);
    this._handlerFb = () => {
    };
    this._active = EMPTY_HANDLERS3;
  }
  reset() {
    if (this._active.length) {
      for (let j = this._stack.paused ? this._stack.loopPosition - 1 : this._active.length - 1; j >= 0; --j) {
        this._active[j].end(false);
      }
    }
    this._stack.paused = false;
    this._active = EMPTY_HANDLERS3;
    this._ident = 0;
  }
  start(ident) {
    this.reset();
    this._ident = ident;
    this._active = this._handlers[ident] || EMPTY_HANDLERS3;
    if (!this._active.length) {
      this._handlerFb(this._ident, "START");
    } else {
      for (let j = this._active.length - 1; j >= 0; j--) {
        this._active[j].start();
      }
    }
  }
  put(data, start, end) {
    if (!this._active.length) {
      this._handlerFb(this._ident, "PUT", utf32ToString(data, start, end));
    } else {
      for (let j = this._active.length - 1; j >= 0; j--) {
        this._active[j].put(data, start, end);
      }
    }
  }
  /**
   * Indicates end of an APC command.
   * Whether the APC got aborted or finished normally
   * is indicated by `success`.
   */
  end(success, promiseResult = true) {
    if (!this._active.length) {
      this._handlerFb(this._ident, "END", success);
    } else {
      let handlerResult = false;
      let j = this._active.length - 1;
      let fallThrough = false;
      if (this._stack.paused) {
        j = this._stack.loopPosition - 1;
        handlerResult = promiseResult;
        fallThrough = this._stack.fallThrough;
        this._stack.paused = false;
      }
      if (!fallThrough && handlerResult === false) {
        for (; j >= 0; j--) {
          handlerResult = this._active[j].end(success);
          if (handlerResult === true) {
            break;
          } else if (handlerResult instanceof Promise) {
            this._stack.paused = true;
            this._stack.loopPosition = j;
            this._stack.fallThrough = false;
            return handlerResult;
          }
        }
        j--;
      }
      for (; j >= 0; j--) {
        handlerResult = this._active[j].end(false);
        if (handlerResult instanceof Promise) {
          this._stack.paused = true;
          this._stack.loopPosition = j;
          this._stack.fallThrough = true;
          return handlerResult;
        }
      }
    }
    this._active = EMPTY_HANDLERS3;
    this._ident = 0;
  }
};
var _ApcHandler = class _ApcHandler {
  constructor(_handler) {
    this._handler = _handler;
    this._data = new LimitedStringBuilder(_ApcHandler._payloadLimit);
    this._hitLimit = false;
  }
  start() {
    this._data.reset();
    this._hitLimit = false;
  }
  put(data, start, end) {
    if (this._hitLimit) {
      return;
    }
    if (this._data.append(utf32ToString(data, start, end))) {
      this._hitLimit = true;
    }
  }
  end(success) {
    let ret = false;
    if (this._hitLimit) {
      ret = false;
    } else if (success) {
      ret = this._handler(this._data.toString());
      if (ret instanceof Promise) {
        return ret.then((res) => {
          this._data.reset();
          this._hitLimit = false;
          return res;
        });
      }
    }
    this._data.reset();
    this._hitLimit = false;
    return ret;
  }
};
_ApcHandler._payloadLimit = 1e7 /* PAYLOAD_LIMIT */;
var ApcHandler = _ApcHandler;

// src/common/parser/EscapeSequenceParser.ts
var TransitionTable = class {
  constructor(length) {
    this.table = new Uint16Array(length);
  }
  /**
   * Set default transition.
   * @param action default action
   * @param next default next state
   */
  setDefault(action, next) {
    this.table.fill(action << 8 /* TRANSITION_ACTION_SHIFT */ | next);
  }
  /**
   * Add a transition to the transition table.
   * @param code input character code
   * @param state current parser state
   * @param action parser action to be done
   * @param next next parser state
   */
  add(code, state, action, next) {
    this.table[state << 8 /* INDEX_STATE_SHIFT */ | code] = action << 8 /* TRANSITION_ACTION_SHIFT */ | next;
  }
  /**
   * Add transitions for multiple input character codes.
   * @param codes input character code array
   * @param state current parser state
   * @param action parser action to be done
   * @param next next parser state
   */
  addMany(codes, state, action, next) {
    for (let i = 0; i < codes.length; i++) {
      this.table[state << 8 /* INDEX_STATE_SHIFT */ | codes[i]] = action << 8 /* TRANSITION_ACTION_SHIFT */ | next;
    }
  }
};
var NON_ASCII_PRINTABLE = 160;
var VT500_TRANSITION_TABLE = (function() {
  const table2 = new TransitionTable(4257);
  const BYTE_VALUES = 256;
  const blueprint = Array.apply(null, Array(BYTE_VALUES)).map((unused, i) => i);
  const r = (start, end) => blueprint.slice(start, end);
  const PRINTABLES = r(32, 127);
  const EXECUTABLES = r(0, 24);
  EXECUTABLES.push(25);
  EXECUTABLES.push.apply(EXECUTABLES, r(28, 32));
  const states = r(0 /* GROUND */, 17 /* STATE_LENGTH */);
  table2.setDefault(1 /* ERROR */, 0 /* GROUND */);
  table2.addMany(PRINTABLES, 0 /* GROUND */, 2 /* PRINT */, 0 /* GROUND */);
  for (const state of states) {
    table2.addMany([24, 26, 153, 154], state, 3 /* EXECUTE */, 0 /* GROUND */);
    table2.addMany(r(128, 144), state, 3 /* EXECUTE */, 0 /* GROUND */);
    table2.addMany(r(144, 152), state, 3 /* EXECUTE */, 0 /* GROUND */);
    table2.add(156, state, 0 /* IGNORE */, 0 /* GROUND */);
    table2.add(27, state, 11 /* CLEAR */, 1 /* ESCAPE */);
    table2.add(157, state, 4 /* OSC_START */, 8 /* OSC_STRING */);
    table2.addMany([152, 158], state, 0 /* IGNORE */, 7 /* SOS_PM_STRING */);
    table2.add(159, state, 11 /* CLEAR */, 14 /* APC_ENTRY */);
    table2.add(155, state, 11 /* CLEAR */, 3 /* CSI_ENTRY */);
    table2.add(144, state, 11 /* CLEAR */, 9 /* DCS_ENTRY */);
  }
  table2.addMany(EXECUTABLES, 0 /* GROUND */, 3 /* EXECUTE */, 0 /* GROUND */);
  table2.addMany(EXECUTABLES, 1 /* ESCAPE */, 3 /* EXECUTE */, 1 /* ESCAPE */);
  table2.add(127, 1 /* ESCAPE */, 0 /* IGNORE */, 1 /* ESCAPE */);
  table2.addMany(EXECUTABLES, 8 /* OSC_STRING */, 0 /* IGNORE */, 8 /* OSC_STRING */);
  table2.addMany(EXECUTABLES, 3 /* CSI_ENTRY */, 3 /* EXECUTE */, 3 /* CSI_ENTRY */);
  table2.add(127, 3 /* CSI_ENTRY */, 0 /* IGNORE */, 3 /* CSI_ENTRY */);
  table2.addMany(EXECUTABLES, 4 /* CSI_PARAM */, 3 /* EXECUTE */, 4 /* CSI_PARAM */);
  table2.add(127, 4 /* CSI_PARAM */, 0 /* IGNORE */, 4 /* CSI_PARAM */);
  table2.addMany(EXECUTABLES, 6 /* CSI_IGNORE */, 3 /* EXECUTE */, 6 /* CSI_IGNORE */);
  table2.addMany(EXECUTABLES, 5 /* CSI_INTERMEDIATE */, 3 /* EXECUTE */, 5 /* CSI_INTERMEDIATE */);
  table2.add(127, 5 /* CSI_INTERMEDIATE */, 0 /* IGNORE */, 5 /* CSI_INTERMEDIATE */);
  table2.addMany(EXECUTABLES, 2 /* ESCAPE_INTERMEDIATE */, 3 /* EXECUTE */, 2 /* ESCAPE_INTERMEDIATE */);
  table2.add(127, 2 /* ESCAPE_INTERMEDIATE */, 0 /* IGNORE */, 2 /* ESCAPE_INTERMEDIATE */);
  table2.add(93, 1 /* ESCAPE */, 4 /* OSC_START */, 8 /* OSC_STRING */);
  table2.addMany(PRINTABLES, 8 /* OSC_STRING */, 5 /* OSC_PUT */, 8 /* OSC_STRING */);
  table2.add(127, 8 /* OSC_STRING */, 5 /* OSC_PUT */, 8 /* OSC_STRING */);
  table2.addMany([156, 27, 24, 26, 7], 8 /* OSC_STRING */, 6 /* OSC_END */, 0 /* GROUND */);
  table2.addMany(r(28, 32), 8 /* OSC_STRING */, 0 /* IGNORE */, 8 /* OSC_STRING */);
  table2.addMany([88, 94], 1 /* ESCAPE */, 0 /* IGNORE */, 7 /* SOS_PM_STRING */);
  table2.addMany(PRINTABLES, 7 /* SOS_PM_STRING */, 0 /* IGNORE */, 7 /* SOS_PM_STRING */);
  table2.addMany(EXECUTABLES, 7 /* SOS_PM_STRING */, 0 /* IGNORE */, 7 /* SOS_PM_STRING */);
  table2.add(156, 7 /* SOS_PM_STRING */, 0 /* IGNORE */, 0 /* GROUND */);
  table2.add(127, 7 /* SOS_PM_STRING */, 0 /* IGNORE */, 7 /* SOS_PM_STRING */);
  table2.add(95, 1 /* ESCAPE */, 11 /* CLEAR */, 14 /* APC_ENTRY */);
  table2.addMany(EXECUTABLES, 14 /* APC_ENTRY */, 0 /* IGNORE */, 14 /* APC_ENTRY */);
  table2.add(127, 14 /* APC_ENTRY */, 0 /* IGNORE */, 14 /* APC_ENTRY */);
  table2.addMany(r(32, 48), 14 /* APC_ENTRY */, 9 /* COLLECT */, 15 /* APC_INTERMEDIATE */);
  table2.addMany(r(48, 127), 14 /* APC_ENTRY */, 15 /* APC_START */, 16 /* APC_PASSTHROUGH */);
  table2.addMany(r(48, 127), 15 /* APC_INTERMEDIATE */, 15 /* APC_START */, 16 /* APC_PASSTHROUGH */);
  table2.addMany(EXECUTABLES, 15 /* APC_INTERMEDIATE */, 0 /* IGNORE */, 15 /* APC_INTERMEDIATE */);
  table2.addMany(r(32, 48), 15 /* APC_INTERMEDIATE */, 9 /* COLLECT */, 15 /* APC_INTERMEDIATE */);
  table2.add(127, 15 /* APC_INTERMEDIATE */, 0 /* IGNORE */, 15 /* APC_INTERMEDIATE */);
  table2.addMany(PRINTABLES, 16 /* APC_PASSTHROUGH */, 16 /* APC_PUT */, 16 /* APC_PASSTHROUGH */);
  table2.addMany(EXECUTABLES, 16 /* APC_PASSTHROUGH */, 0 /* IGNORE */, 16 /* APC_PASSTHROUGH */);
  table2.addMany(r(8, 14), 16 /* APC_PASSTHROUGH */, 16 /* APC_PUT */, 16 /* APC_PASSTHROUGH */);
  table2.add(127, 16 /* APC_PASSTHROUGH */, 0 /* IGNORE */, 16 /* APC_PASSTHROUGH */);
  table2.addMany([27, 156, 24, 26], 16 /* APC_PASSTHROUGH */, 17 /* APC_END */, 0 /* GROUND */);
  table2.add(91, 1 /* ESCAPE */, 11 /* CLEAR */, 3 /* CSI_ENTRY */);
  table2.addMany(r(64, 127), 3 /* CSI_ENTRY */, 7 /* CSI_DISPATCH */, 0 /* GROUND */);
  table2.addMany(r(48, 60), 3 /* CSI_ENTRY */, 8 /* PARAM */, 4 /* CSI_PARAM */);
  table2.addMany([60, 61, 62, 63], 3 /* CSI_ENTRY */, 9 /* COLLECT */, 4 /* CSI_PARAM */);
  table2.addMany(r(48, 60), 4 /* CSI_PARAM */, 8 /* PARAM */, 4 /* CSI_PARAM */);
  table2.addMany(r(64, 127), 4 /* CSI_PARAM */, 7 /* CSI_DISPATCH */, 0 /* GROUND */);
  table2.addMany([60, 61, 62, 63], 4 /* CSI_PARAM */, 0 /* IGNORE */, 6 /* CSI_IGNORE */);
  table2.addMany(r(32, 64), 6 /* CSI_IGNORE */, 0 /* IGNORE */, 6 /* CSI_IGNORE */);
  table2.add(127, 6 /* CSI_IGNORE */, 0 /* IGNORE */, 6 /* CSI_IGNORE */);
  table2.addMany(r(64, 127), 6 /* CSI_IGNORE */, 0 /* IGNORE */, 0 /* GROUND */);
  table2.addMany(r(32, 48), 3 /* CSI_ENTRY */, 9 /* COLLECT */, 5 /* CSI_INTERMEDIATE */);
  table2.addMany(r(32, 48), 5 /* CSI_INTERMEDIATE */, 9 /* COLLECT */, 5 /* CSI_INTERMEDIATE */);
  table2.addMany(r(48, 64), 5 /* CSI_INTERMEDIATE */, 0 /* IGNORE */, 6 /* CSI_IGNORE */);
  table2.addMany(r(64, 127), 5 /* CSI_INTERMEDIATE */, 7 /* CSI_DISPATCH */, 0 /* GROUND */);
  table2.addMany(r(32, 48), 4 /* CSI_PARAM */, 9 /* COLLECT */, 5 /* CSI_INTERMEDIATE */);
  table2.addMany(r(32, 48), 1 /* ESCAPE */, 9 /* COLLECT */, 2 /* ESCAPE_INTERMEDIATE */);
  table2.addMany(r(32, 48), 2 /* ESCAPE_INTERMEDIATE */, 9 /* COLLECT */, 2 /* ESCAPE_INTERMEDIATE */);
  table2.addMany(r(48, 127), 2 /* ESCAPE_INTERMEDIATE */, 10 /* ESC_DISPATCH */, 0 /* GROUND */);
  table2.addMany(r(48, 80), 1 /* ESCAPE */, 10 /* ESC_DISPATCH */, 0 /* GROUND */);
  table2.addMany(r(81, 88), 1 /* ESCAPE */, 10 /* ESC_DISPATCH */, 0 /* GROUND */);
  table2.addMany([89, 90, 92], 1 /* ESCAPE */, 10 /* ESC_DISPATCH */, 0 /* GROUND */);
  table2.addMany(r(96, 127), 1 /* ESCAPE */, 10 /* ESC_DISPATCH */, 0 /* GROUND */);
  table2.add(80, 1 /* ESCAPE */, 11 /* CLEAR */, 9 /* DCS_ENTRY */);
  table2.addMany(EXECUTABLES, 9 /* DCS_ENTRY */, 0 /* IGNORE */, 9 /* DCS_ENTRY */);
  table2.add(127, 9 /* DCS_ENTRY */, 0 /* IGNORE */, 9 /* DCS_ENTRY */);
  table2.addMany(r(32, 48), 9 /* DCS_ENTRY */, 9 /* COLLECT */, 12 /* DCS_INTERMEDIATE */);
  table2.addMany(r(48, 60), 9 /* DCS_ENTRY */, 8 /* PARAM */, 10 /* DCS_PARAM */);
  table2.addMany([60, 61, 62, 63], 9 /* DCS_ENTRY */, 9 /* COLLECT */, 10 /* DCS_PARAM */);
  table2.addMany(EXECUTABLES, 11 /* DCS_IGNORE */, 0 /* IGNORE */, 11 /* DCS_IGNORE */);
  table2.addMany(r(32, 128), 11 /* DCS_IGNORE */, 0 /* IGNORE */, 11 /* DCS_IGNORE */);
  table2.addMany(EXECUTABLES, 10 /* DCS_PARAM */, 0 /* IGNORE */, 10 /* DCS_PARAM */);
  table2.add(127, 10 /* DCS_PARAM */, 0 /* IGNORE */, 10 /* DCS_PARAM */);
  table2.addMany(r(48, 60), 10 /* DCS_PARAM */, 8 /* PARAM */, 10 /* DCS_PARAM */);
  table2.addMany([60, 61, 62, 63], 10 /* DCS_PARAM */, 0 /* IGNORE */, 11 /* DCS_IGNORE */);
  table2.addMany(r(32, 48), 10 /* DCS_PARAM */, 9 /* COLLECT */, 12 /* DCS_INTERMEDIATE */);
  table2.addMany(EXECUTABLES, 12 /* DCS_INTERMEDIATE */, 0 /* IGNORE */, 12 /* DCS_INTERMEDIATE */);
  table2.add(127, 12 /* DCS_INTERMEDIATE */, 0 /* IGNORE */, 12 /* DCS_INTERMEDIATE */);
  table2.addMany(r(32, 48), 12 /* DCS_INTERMEDIATE */, 9 /* COLLECT */, 12 /* DCS_INTERMEDIATE */);
  table2.addMany(r(48, 64), 12 /* DCS_INTERMEDIATE */, 0 /* IGNORE */, 11 /* DCS_IGNORE */);
  table2.addMany(r(64, 127), 12 /* DCS_INTERMEDIATE */, 12 /* DCS_HOOK */, 13 /* DCS_PASSTHROUGH */);
  table2.addMany(r(64, 127), 10 /* DCS_PARAM */, 12 /* DCS_HOOK */, 13 /* DCS_PASSTHROUGH */);
  table2.addMany(r(64, 127), 9 /* DCS_ENTRY */, 12 /* DCS_HOOK */, 13 /* DCS_PASSTHROUGH */);
  table2.addMany(EXECUTABLES, 13 /* DCS_PASSTHROUGH */, 13 /* DCS_PUT */, 13 /* DCS_PASSTHROUGH */);
  table2.addMany(PRINTABLES, 13 /* DCS_PASSTHROUGH */, 13 /* DCS_PUT */, 13 /* DCS_PASSTHROUGH */);
  table2.add(127, 13 /* DCS_PASSTHROUGH */, 0 /* IGNORE */, 13 /* DCS_PASSTHROUGH */);
  table2.addMany([27, 156, 24, 26], 13 /* DCS_PASSTHROUGH */, 14 /* DCS_UNHOOK */, 0 /* GROUND */);
  table2.add(NON_ASCII_PRINTABLE, 0 /* GROUND */, 2 /* PRINT */, 0 /* GROUND */);
  table2.add(NON_ASCII_PRINTABLE, 8 /* OSC_STRING */, 5 /* OSC_PUT */, 8 /* OSC_STRING */);
  table2.add(NON_ASCII_PRINTABLE, 6 /* CSI_IGNORE */, 0 /* IGNORE */, 6 /* CSI_IGNORE */);
  table2.add(NON_ASCII_PRINTABLE, 11 /* DCS_IGNORE */, 0 /* IGNORE */, 11 /* DCS_IGNORE */);
  table2.add(NON_ASCII_PRINTABLE, 13 /* DCS_PASSTHROUGH */, 13 /* DCS_PUT */, 13 /* DCS_PASSTHROUGH */);
  table2.add(NON_ASCII_PRINTABLE, 16 /* APC_PASSTHROUGH */, 16 /* APC_PUT */, 16 /* APC_PASSTHROUGH */);
  return table2;
})();
var EscapeSequenceParser = class extends Disposable {
  constructor(_transitions = VT500_TRANSITION_TABLE) {
    super();
    this._transitions = _transitions;
    // parser stack save for async handler support
    this._parseStack = {
      state: 0 /* NONE */,
      handlers: [],
      handlerPos: 0,
      transition: 0,
      chunkPos: 0
    };
    this.initialState = 0 /* GROUND */;
    this.currentState = this.initialState;
    this._params = new Params();
    this._params.addParam(0);
    this._collect = 0;
    this.precedingJoinState = 0;
    this._printHandlerFb = (data, start, end) => {
    };
    this._executeHandlerFb = (code) => {
    };
    this._csiHandlerFb = (ident, params) => {
    };
    this._escHandlerFb = (ident) => {
    };
    this._errorHandlerFb = (state) => state;
    this._printHandler = this._printHandlerFb;
    this._executeHandlers = /* @__PURE__ */ Object.create(null);
    this._executeHandlersArr = new Array(24).fill(void 0);
    this._csiHandlers = /* @__PURE__ */ Object.create(null);
    this._escHandlers = /* @__PURE__ */ Object.create(null);
    this._register(toDisposable(() => {
      this._csiHandlers = /* @__PURE__ */ Object.create(null);
      this._executeHandlers = /* @__PURE__ */ Object.create(null);
      this._executeHandlersArr = new Array(24).fill(void 0);
      this._escHandlers = /* @__PURE__ */ Object.create(null);
    }));
    this._oscParser = this._register(new OscParser());
    this._dcsParser = this._register(new DcsParser());
    this._apcParser = this._register(new ApcParser());
    this._errorHandler = this._errorHandlerFb;
    this.registerEscHandler({ final: "\\" }, () => true);
  }
  _identifier(id, finalRange = [64, 126]) {
    let res = 0;
    if (id.prefix) {
      if (id.prefix.length > 1) {
        throw new Error("only one byte as prefix supported");
      }
      res = id.prefix.charCodeAt(0);
      if (res < 60 || res > 63) {
        throw new Error("prefix must be in range 0x3c .. 0x3f");
      }
    }
    if (id.intermediates) {
      if (id.intermediates.length > 2) {
        throw new Error("only two bytes as intermediates are supported");
      }
      for (let i = 0; i < id.intermediates.length; ++i) {
        const intermediate = id.intermediates.charCodeAt(i);
        if (32 > intermediate || intermediate > 47) {
          throw new Error("intermediate must be in range 0x20 .. 0x2f");
        }
        res <<= 8;
        res |= intermediate;
      }
    }
    if (id.final.length !== 1) {
      throw new Error("final must be a single byte");
    }
    const finalCode = id.final.charCodeAt(0);
    if (finalRange[0] > finalCode || finalCode > finalRange[1]) {
      throw new Error(`final must be in range ${finalRange[0]} .. ${finalRange[1]}`);
    }
    res <<= 8;
    res |= finalCode;
    return res;
  }
  identToString(ident) {
    const res = [];
    while (ident) {
      res.push(String.fromCharCode(ident & 255));
      ident >>= 8;
    }
    return res.reverse().join("");
  }
  setPrintHandler(handler) {
    this._printHandler = handler;
  }
  clearPrintHandler() {
    this._printHandler = this._printHandlerFb;
  }
  registerEscHandler(id, handler) {
    const ident = this._identifier(id, [48, 126]);
    this._escHandlers[ident] ??= [];
    const handlerList = this._escHandlers[ident];
    handlerList.push(handler);
    return {
      dispose: () => {
        const handlerIndex = handlerList.indexOf(handler);
        if (handlerIndex !== -1) {
          handlerList.splice(handlerIndex, 1);
        }
      }
    };
  }
  clearEscHandler(id) {
    if (this._escHandlers[this._identifier(id, [48, 126])]) delete this._escHandlers[this._identifier(id, [48, 126])];
  }
  setEscHandlerFallback(handler) {
    this._escHandlerFb = handler;
  }
  setExecuteHandler(flag, handler) {
    const code = flag.charCodeAt(0);
    this._executeHandlers[code] = handler;
    if (code < 24) this._executeHandlersArr[code] = handler;
  }
  clearExecuteHandler(flag) {
    const code = flag.charCodeAt(0);
    if (this._executeHandlers[code]) delete this._executeHandlers[code];
    if (code < 24) this._executeHandlersArr[code] = void 0;
  }
  setExecuteHandlerFallback(handler) {
    this._executeHandlerFb = handler;
  }
  registerCsiHandler(id, handler) {
    const ident = this._identifier(id);
    this._csiHandlers[ident] ??= [];
    const handlerList = this._csiHandlers[ident];
    handlerList.push(handler);
    return {
      dispose: () => {
        const handlerIndex = handlerList.indexOf(handler);
        if (handlerIndex !== -1) {
          handlerList.splice(handlerIndex, 1);
        }
      }
    };
  }
  clearCsiHandler(id) {
    if (this._csiHandlers[this._identifier(id)]) delete this._csiHandlers[this._identifier(id)];
  }
  setCsiHandlerFallback(callback) {
    this._csiHandlerFb = callback;
  }
  registerDcsHandler(id, handler) {
    return this._dcsParser.registerHandler(this._identifier(id), handler);
  }
  clearDcsHandler(id) {
    this._dcsParser.clearHandler(this._identifier(id));
  }
  setDcsHandlerFallback(handler) {
    this._dcsParser.setHandlerFallback(handler);
  }
  registerOscHandler(ident, handler) {
    return this._oscParser.registerHandler(ident, handler);
  }
  clearOscHandler(ident) {
    this._oscParser.clearHandler(ident);
  }
  setOscHandlerFallback(handler) {
    this._oscParser.setHandlerFallback(handler);
  }
  registerApcHandler(id, handler) {
    id.prefix = void 0;
    return this._apcParser.registerHandler(this._identifier(id, [48, 126]), handler);
  }
  clearApcHandler(id) {
    id.prefix = void 0;
    this._apcParser.clearHandler(this._identifier(id, [48, 126]));
  }
  setApcHandlerFallback(handler) {
    this._apcParser.setHandlerFallback(handler);
  }
  setErrorHandler(callback) {
    this._errorHandler = callback;
  }
  clearErrorHandler() {
    this._errorHandler = this._errorHandlerFb;
  }
  /**
   * Reset parser to initial values.
   *
   * This can also be used to lift the improper continuation error condition
   * when dealing with async handlers. Use this only as a last resort to silence
   * that error when the terminal has no pending data to be processed. Note that
   * the interrupted async handler might continue its work in the future messing
   * up the terminal state even further.
   */
  reset() {
    this.currentState = this.initialState;
    this._oscParser.reset();
    this._dcsParser.reset();
    this._apcParser.reset();
    this._params.resetZdm();
    this._collect = 0;
    this.precedingJoinState = 0;
    if (this._parseStack.state !== 0 /* NONE */) {
      this._parseStack.state = 2 /* RESET */;
      this._parseStack.handlers = [];
    }
  }
  /**
   * Async parse support.
   */
  _preserveStack(state, handlers, handlerPos, transition, chunkPos) {
    this._parseStack.state = state;
    this._parseStack.handlers = handlers;
    this._parseStack.handlerPos = handlerPos;
    this._parseStack.transition = transition;
    this._parseStack.chunkPos = chunkPos;
  }
  /**
   * Parse UTF32 codepoints in `data` up to `length`.
   *
   * Note: For several actions with high data load the parsing is optimized
   * by using local read ahead loops with hardcoded conditions to
   * avoid costly table lookups. Make sure that any change of table values
   * will be reflected in the loop conditions as well and vice versa.
   * Affected states/actions:
   * - GROUND:PRINT
   * - CSI_PARAM:PARAM
   * - DCS_PARAM:PARAM
   * - OSC_STRING:OSC_PUT
   * - DCS_PASSTHROUGH:DCS_PUT
   *
   * Additionally the following fast paths exist before the table lookup:
   * - EXE bytes < 0x18 in non-payload states (avoids table lookup entirely)
   * - 7-bit CSI sequences without intermediates (ESC [ params final)
   *
   * Note on asynchronous handler support:
   * Any handler returning a promise will be treated as asynchronous.
   * To keep the in-band blocking working for async handlers, `parse` pauses execution,
   * creates a stack save and returns the promise to the caller.
   * For proper continuation of the paused state it is important
   * to await the promise resolving. On resolve the parse must be repeated
   * with the same chunk of data and the resolved value in `promiseResult`
   * until no promise is returned.
   *
   * Important: With only sync handlers defined, parsing is completely synchronous as well.
   * As soon as an async handler is involved, synchronous parsing is not possible anymore.
   *
   * Boilerplate for proper parsing of multiple chunks with async handlers:
   *
   * ```typescript
   * async function parseMultipleChunks(chunks: Uint32Array[]): Promise<void> {
   *   for (const chunk of chunks) {
   *     let result: void | Promise<boolean>;
   *     let prev: boolean | undefined;
   *     while (result = parser.parse(chunk, chunk.length, prev)) {
   *       prev = await result;
   *     }
   *   }
   *   // finished parsing all chunks...
   * }
   * ```
   */
  parse(data, length, promiseResult) {
    let code;
    let transition;
    let start = 0;
    let handlerResult;
    if (this._parseStack.state) {
      if (this._parseStack.state === 2 /* RESET */) {
        this._parseStack.state = 0 /* NONE */;
        start = this._parseStack.chunkPos + 1;
      } else {
        if (promiseResult === void 0 || this._parseStack.state === 1 /* FAIL */) {
          this._parseStack.state = 1 /* FAIL */;
          throw new Error("improper continuation due to previous async handler, giving up parsing");
        }
        const handlers = this._parseStack.handlers;
        let handlerPos = this._parseStack.handlerPos - 1;
        switch (this._parseStack.state) {
          case 3 /* CSI */:
            if (promiseResult === false && handlerPos > -1) {
              for (; handlerPos >= 0; handlerPos--) {
                handlerResult = handlers[handlerPos](this._params);
                if (handlerResult === true) {
                  break;
                } else if (handlerResult instanceof Promise) {
                  this._parseStack.handlerPos = handlerPos;
                  return handlerResult;
                }
              }
            }
            this._parseStack.handlers = [];
            break;
          case 4 /* ESC */:
            if (promiseResult === false && handlerPos > -1) {
              for (; handlerPos >= 0; handlerPos--) {
                handlerResult = handlers[handlerPos]();
                if (handlerResult === true) {
                  break;
                } else if (handlerResult instanceof Promise) {
                  this._parseStack.handlerPos = handlerPos;
                  return handlerResult;
                }
              }
            }
            this._parseStack.handlers = [];
            break;
          case 6 /* DCS */:
            code = data[this._parseStack.chunkPos];
            handlerResult = this._dcsParser.unhook(code !== 24 && code !== 26, promiseResult);
            if (handlerResult) {
              return handlerResult;
            }
            if (code === 27) this._parseStack.transition |= 1 /* ESCAPE */;
            this._params.resetZdm();
            this._collect = 0;
            break;
          case 5 /* OSC */:
            code = data[this._parseStack.chunkPos];
            handlerResult = this._oscParser.end(code !== 24 && code !== 26, promiseResult);
            if (handlerResult) {
              return handlerResult;
            }
            if (code === 27) this._parseStack.transition |= 1 /* ESCAPE */;
            this._params.resetZdm();
            this._collect = 0;
            break;
          case 7 /* APC */:
            code = data[this._parseStack.chunkPos];
            handlerResult = this._apcParser.end(code !== 24 && code !== 26, promiseResult);
            if (handlerResult) {
              return handlerResult;
            }
            if (code === 27) this._parseStack.transition |= 1 /* ESCAPE */;
            this._params.resetZdm();
            this._collect = 0;
            break;
        }
        this._parseStack.state = 0 /* NONE */;
        start = this._parseStack.chunkPos + 1;
        this.precedingJoinState = 0;
        this.currentState = this._parseStack.transition & 255 /* TRANSITION_STATE_MASK */;
      }
    }
    for (let i = start; i < length; ++i) {
      code = data[i];
      if (code < 24 && this.currentState <= 6 /* CSI_IGNORE */) {
        (this._executeHandlersArr[code] ?? this._executeHandlerFb)(code);
        this.precedingJoinState = 0;
        continue;
      }
      if (code === 27 && this.currentState < 8 /* OSC_STRING */ && i + 2 < length && data[i + 1] === 91) {
        this._params.resetZdm();
        this._collect = 0;
        let k = i + 2;
        let ch = data[k];
        if (ch >= 60 && ch <= 63) {
          this._collect = ch;
          k++;
        }
        let csiDone = false;
        for (; k < length; k++) {
          ch = data[k];
          if (ch >= 48 && ch <= 57) {
            this._params.addDigit(ch - 48);
          } else if (ch === 59) {
            this._params.addParam(0);
          } else if (ch === 58) {
            this._params.addSubParam(-1);
          } else if (ch >= 64 && ch <= 126) {
            const handlers = this._csiHandlers[this._collect << 8 | ch];
            let j = handlers ? handlers.length - 1 : -1;
            for (; j >= 0; j--) {
              handlerResult = handlers[j](this._params);
              if (handlerResult === true) {
                break;
              } else if (handlerResult instanceof Promise) {
                transition = 7 /* CSI_DISPATCH */ << 8 /* TRANSITION_ACTION_SHIFT */ | 0 /* GROUND */;
                this._preserveStack(3 /* CSI */, handlers, j, transition, k);
                return handlerResult;
              }
            }
            if (j < 0) {
              this._csiHandlerFb(this._collect << 8 | ch, this._params);
            }
            this.precedingJoinState = 0;
            i = k;
            this.currentState = 0 /* GROUND */;
            csiDone = true;
            break;
          } else {
            break;
          }
        }
        if (!csiDone) {
          i = k - 1;
          this.currentState = 4 /* CSI_PARAM */;
        }
        continue;
      }
      transition = this._transitions.table[this.currentState << 8 /* INDEX_STATE_SHIFT */ | (code < NON_ASCII_PRINTABLE ? code : NON_ASCII_PRINTABLE)];
      switch (transition >> 8 /* TRANSITION_ACTION_SHIFT */) {
        case 2 /* PRINT */:
          let c = i;
          const l4 = length - 4;
          while (c < l4 && data[++c] >= 32 && (data[c] <= 126 || data[c] >= NON_ASCII_PRINTABLE) && data[++c] >= 32 && (data[c] <= 126 || data[c] >= NON_ASCII_PRINTABLE) && data[++c] >= 32 && (data[c] <= 126 || data[c] >= NON_ASCII_PRINTABLE) && data[++c] >= 32 && (data[c] <= 126 || data[c] >= NON_ASCII_PRINTABLE)) {
          }
          if (c >= l4) {
            while (c < length && data[c] >= 32 && (data[c] <= 126 || data[c] >= NON_ASCII_PRINTABLE)) {
              c++;
            }
          }
          this._printHandler(data, i, c);
          i = c - 1;
          break;
        case 3 /* EXECUTE */:
          if (this._executeHandlers[code]) this._executeHandlers[code]();
          else this._executeHandlerFb(code);
          this.precedingJoinState = 0;
          break;
        case 0 /* IGNORE */:
          break;
        case 1 /* ERROR */:
          const inject = this._errorHandler(
            {
              position: i,
              code,
              currentState: this.currentState,
              collect: this._collect,
              params: this._params,
              abort: false
            }
          );
          if (inject.abort) return;
          break;
        case 7 /* CSI_DISPATCH */:
          const handlers = this._csiHandlers[this._collect << 8 | code];
          let j = handlers ? handlers.length - 1 : -1;
          for (; j >= 0; j--) {
            handlerResult = handlers[j](this._params);
            if (handlerResult === true) {
              break;
            } else if (handlerResult instanceof Promise) {
              this._preserveStack(3 /* CSI */, handlers, j, transition, i);
              return handlerResult;
            }
          }
          if (j < 0) {
            this._csiHandlerFb(this._collect << 8 | code, this._params);
          }
          this.precedingJoinState = 0;
          break;
        case 8 /* PARAM */:
          do {
            switch (code) {
              case 59:
                this._params.addParam(0);
                break;
              case 58:
                this._params.addSubParam(-1);
                break;
              default:
                this._params.addDigit(code - 48);
            }
          } while (++i < length && (code = data[i]) > 47 && code < 60);
          i--;
          break;
        case 9 /* COLLECT */:
          this._collect <<= 8;
          this._collect |= code;
          break;
        case 10 /* ESC_DISPATCH */:
          const handlersEsc = this._escHandlers[this._collect << 8 | code];
          let jj = handlersEsc ? handlersEsc.length - 1 : -1;
          for (; jj >= 0; jj--) {
            handlerResult = handlersEsc[jj]();
            if (handlerResult === true) {
              break;
            } else if (handlerResult instanceof Promise) {
              this._preserveStack(4 /* ESC */, handlersEsc, jj, transition, i);
              return handlerResult;
            }
          }
          if (jj < 0) {
            this._escHandlerFb(this._collect << 8 | code);
          }
          this.precedingJoinState = 0;
          break;
        case 11 /* CLEAR */:
          this._params.resetZdm();
          this._collect = 0;
          break;
        case 12 /* DCS_HOOK */:
          this._dcsParser.hook(this._collect << 8 | code, this._params);
          break;
        case 13 /* DCS_PUT */:
          for (let j2 = i + 1; ; ++j2) {
            if (j2 >= length || (code = data[j2]) === 24 || code === 26 || code === 27 || code > 127 && code < NON_ASCII_PRINTABLE) {
              this._dcsParser.put(data, i, j2);
              i = j2 - 1;
              break;
            }
          }
          break;
        case 14 /* DCS_UNHOOK */:
          handlerResult = this._dcsParser.unhook(code !== 24 && code !== 26);
          if (handlerResult) {
            this._preserveStack(6 /* DCS */, [], 0, transition, i);
            return handlerResult;
          }
          if (code === 27) transition |= 1 /* ESCAPE */;
          this._params.resetZdm();
          this._collect = 0;
          this.precedingJoinState = 0;
          break;
        case 4 /* OSC_START */:
          this._oscParser.start();
          break;
        case 5 /* OSC_PUT */:
          for (let j2 = i + 1; ; j2++) {
            if (j2 >= length || (code = data[j2]) < 32 || code > 127 && code < NON_ASCII_PRINTABLE) {
              this._oscParser.put(data, i, j2);
              i = j2 - 1;
              break;
            }
          }
          break;
        case 6 /* OSC_END */:
          handlerResult = this._oscParser.end(code !== 24 && code !== 26);
          if (handlerResult) {
            this._preserveStack(5 /* OSC */, [], 0, transition, i);
            return handlerResult;
          }
          if (code === 27) transition |= 1 /* ESCAPE */;
          this._params.resetZdm();
          this._collect = 0;
          this.precedingJoinState = 0;
          break;
        case 15 /* APC_START */:
          this._apcParser.start(this._collect << 8 | code);
          break;
        case 16 /* APC_PUT */:
          for (let j2 = i + 1; ; ++j2) {
            if (j2 < length && (data[j2] >= 32 && data[j2] < 127 || data[j2] >= 8 && data[j2] < 14 || data[j2] >= NON_ASCII_PRINTABLE)) continue;
            this._apcParser.put(data, i, j2);
            i = j2 - 1;
            break;
          }
          break;
        case 17 /* APC_END */:
          handlerResult = this._apcParser.end(code !== 24 && code !== 26);
          if (handlerResult) {
            this._preserveStack(7 /* APC */, [], 0, transition, i);
            return handlerResult;
          }
          if (code === 27) transition |= 1 /* ESCAPE */;
          this._params.resetZdm();
          this._collect = 0;
          this.precedingJoinState = 0;
          break;
      }
      this.currentState = transition & 255 /* TRANSITION_STATE_MASK */;
    }
  }
};

// src/common/input/XParseColor.ts
var RGB_REX = /^([\da-f])\/([\da-f])\/([\da-f])$|^([\da-f]{2})\/([\da-f]{2})\/([\da-f]{2})$|^([\da-f]{3})\/([\da-f]{3})\/([\da-f]{3})$|^([\da-f]{4})\/([\da-f]{4})\/([\da-f]{4})$/;
var HASH_REX = /^[\da-f]+$/;
function parseColor(data) {
  if (!data) return;
  let low = data.toLowerCase();
  if (low.startsWith("rgb:")) {
    low = low.slice(4);
    const m = RGB_REX.exec(low);
    if (m) {
      const base = m[1] ? 15 : m[4] ? 255 : m[7] ? 4095 : 65535;
      return [
        Math.round(parseInt(m[1] || m[4] || m[7] || m[10], 16) / base * 255),
        Math.round(parseInt(m[2] || m[5] || m[8] || m[11], 16) / base * 255),
        Math.round(parseInt(m[3] || m[6] || m[9] || m[12], 16) / base * 255)
      ];
    }
  } else if (low.startsWith("#")) {
    low = low.slice(1);
    if (HASH_REX.exec(low) && [3, 6, 9, 12].includes(low.length)) {
      const adv = low.length / 3;
      const result = [0, 0, 0];
      for (let i = 0; i < 3; ++i) {
        const c = parseInt(low.slice(adv * i, adv * i + adv), 16);
        result[i] = adv === 1 ? c << 4 : adv === 2 ? c : adv === 3 ? c >> 4 : c >> 8;
      }
      return result;
    }
  }
}

// src/common/Version.ts
var XTERM_VERSION = "6.0.0";

// src/common/InputHandler.ts
var GLEVEL = { "(": 0, ")": 1, "*": 2, "+": 3, "-": 1, ".": 2 };
function paramToWindowOption(n, opts) {
  if (n > 24) {
    return opts.setWinLines || false;
  }
  switch (n) {
    case 1:
      return !!opts.restoreWin;
    case 2:
      return !!opts.minimizeWin;
    case 3:
      return !!opts.setWinPosition;
    case 4:
      return !!opts.setWinSizePixels;
    case 5:
      return !!opts.raiseWin;
    case 6:
      return !!opts.lowerWin;
    case 7:
      return !!opts.refreshWin;
    case 8:
      return !!opts.setWinSizeChars;
    case 9:
      return !!opts.maximizeWin;
    case 10:
      return !!opts.fullscreenWin;
    case 11:
      return !!opts.getWinState;
    case 13:
      return !!opts.getWinPosition;
    case 14:
      return !!opts.getWinSizePixels;
    case 15:
      return !!opts.getScreenSizePixels;
    case 16:
      return !!opts.getCellSizePixels;
    case 18:
      return !!opts.getWinSizeChars;
    case 19:
      return !!opts.getScreenSizeChars;
    case 20:
      return !!opts.getIconTitle;
    case 21:
      return !!opts.getWinTitle;
    case 22:
      return !!opts.pushTitle;
    case 23:
      return !!opts.popTitle;
    case 24:
      return !!opts.setWinLines;
  }
  return false;
}
var $temp = 0;
var InputHandler = class extends Disposable {
  constructor(_bufferService, _charsetService, _coreService, _logService, _optionsService, _oscLinkService, _mouseStateService, _unicodeService, _parser = new EscapeSequenceParser()) {
    super();
    this._bufferService = _bufferService;
    this._charsetService = _charsetService;
    this._coreService = _coreService;
    this._logService = _logService;
    this._optionsService = _optionsService;
    this._oscLinkService = _oscLinkService;
    this._mouseStateService = _mouseStateService;
    this._unicodeService = _unicodeService;
    this._parser = _parser;
    this._parseBuffer = new Uint32Array(4096);
    this._stringDecoder = new StringToUtf32();
    this._utf8Decoder = new Utf8ToUtf32();
    this._windowTitle = "";
    this._iconName = "";
    this._windowTitleStack = [];
    this._iconNameStack = [];
    this._curAttrData = DEFAULT_ATTR_DATA.clone();
    this._eraseAttrDataInternal = DEFAULT_ATTR_DATA.clone();
    this._onRequestBell = this._register(new Emitter());
    this.onRequestBell = this._onRequestBell.event;
    this._onRequestRefreshRows = this._register(new Emitter());
    this.onRequestRefreshRows = this._onRequestRefreshRows.event;
    this._onRequestReset = this._register(new Emitter());
    this.onRequestReset = this._onRequestReset.event;
    this._onRequestSendFocus = this._register(new Emitter());
    this.onRequestSendFocus = this._onRequestSendFocus.event;
    this._onRequestSyncScrollBar = this._register(new Emitter());
    this.onRequestSyncScrollBar = this._onRequestSyncScrollBar.event;
    this._onRequestWindowsOptionsReport = this._register(new Emitter());
    this.onRequestWindowsOptionsReport = this._onRequestWindowsOptionsReport.event;
    this._onA11yChar = this._register(new Emitter());
    this.onA11yChar = this._onA11yChar.event;
    this._onA11yTab = this._register(new Emitter());
    this.onA11yTab = this._onA11yTab.event;
    this._onCursorMove = this._register(new Emitter());
    this.onCursorMove = this._onCursorMove.event;
    this._onLineFeed = this._register(new Emitter());
    this.onLineFeed = this._onLineFeed.event;
    this._onScroll = this._register(new Emitter());
    this.onScroll = this._onScroll.event;
    this._onTitleChange = this._register(new Emitter());
    this.onTitleChange = this._onTitleChange.event;
    this._onColor = this._register(new Emitter());
    this.onColor = this._onColor.event;
    this._onRequestColorSchemeQuery = this._register(new Emitter());
    this.onRequestColorSchemeQuery = this._onRequestColorSchemeQuery.event;
    this._parseStack = {
      paused: false,
      cursorStartX: 0,
      cursorStartY: 0,
      decodedLength: 0,
      position: 0
    };
    // special colors - OSC 10 | 11 | 12
    this._specialColors = [256 /* FOREGROUND */, 257 /* BACKGROUND */, 258 /* CURSOR */];
    this._register(this._parser);
    this._dirtyRowTracker = new DirtyRowTracker(this._bufferService);
    this._activeBuffer = this._bufferService.buffer;
    this._register(this._bufferService.buffers.onBufferActivate((e) => this._activeBuffer = e.activeBuffer));
    this._parser.setCsiHandlerFallback((ident, params) => {
      this._logService.debug("Unknown CSI code: ", { identifier: this._parser.identToString(ident), params: params.toArray() });
    });
    this._parser.setEscHandlerFallback((ident) => {
      this._logService.debug("Unknown ESC code: ", { identifier: this._parser.identToString(ident) });
    });
    this._parser.setExecuteHandlerFallback((code) => {
      this._logService.debug("Unknown EXECUTE code: ", { code });
    });
    this._parser.setOscHandlerFallback((identifier, action, data) => {
      this._logService.debug("Unknown OSC code: ", { identifier, action, data });
    });
    this._parser.setDcsHandlerFallback((ident, action, payload) => {
      if (action === "HOOK") {
        payload = payload.toArray();
      }
      this._logService.debug("Unknown DCS code: ", { identifier: this._parser.identToString(ident), action, payload });
    });
    this._parser.setApcHandlerFallback((ident, action, payload) => {
      this._logService.debug("Unknown APC code: ", { identifier: this._parser.identToString(ident), action, payload });
    });
    this._parser.setPrintHandler((data, start, end) => this.print(data, start, end));
    this._parser.registerCsiHandler({ final: "@" }, (params) => this.insertChars(params));
    this._parser.registerCsiHandler({ intermediates: " ", final: "@" }, (params) => this.scrollLeft(params));
    this._parser.registerCsiHandler({ final: "A" }, (params) => this.cursorUp(params));
    this._parser.registerCsiHandler({ intermediates: " ", final: "A" }, (params) => this.scrollRight(params));
    this._parser.registerCsiHandler({ final: "B" }, (params) => this.cursorDown(params));
    this._parser.registerCsiHandler({ final: "C" }, (params) => this.cursorForward(params));
    this._parser.registerCsiHandler({ final: "D" }, (params) => this.cursorBackward(params));
    this._parser.registerCsiHandler({ final: "E" }, (params) => this.cursorNextLine(params));
    this._parser.registerCsiHandler({ final: "F" }, (params) => this.cursorPrecedingLine(params));
    this._parser.registerCsiHandler({ final: "G" }, (params) => this.cursorCharAbsolute(params));
    this._parser.registerCsiHandler({ final: "H" }, (params) => this.cursorPosition(params));
    this._parser.registerCsiHandler({ final: "I" }, (params) => this.cursorForwardTab(params));
    this._parser.registerCsiHandler({ final: "J" }, (params) => this.eraseInDisplay(params, false));
    this._parser.registerCsiHandler({ prefix: "?", final: "J" }, (params) => this.eraseInDisplay(params, true));
    this._parser.registerCsiHandler({ final: "K" }, (params) => this.eraseInLine(params, false));
    this._parser.registerCsiHandler({ prefix: "?", final: "K" }, (params) => this.eraseInLine(params, true));
    this._parser.registerCsiHandler({ final: "L" }, (params) => this.insertLines(params));
    this._parser.registerCsiHandler({ final: "M" }, (params) => this.deleteLines(params));
    this._parser.registerCsiHandler({ final: "P" }, (params) => this.deleteChars(params));
    this._parser.registerCsiHandler({ final: "S" }, (params) => this.scrollUp(params));
    this._parser.registerCsiHandler({ final: "T" }, (params) => this.scrollDown(params));
    this._parser.registerCsiHandler({ final: "X" }, (params) => this.eraseChars(params));
    this._parser.registerCsiHandler({ final: "Z" }, (params) => this.cursorBackwardTab(params));
    this._parser.registerCsiHandler({ final: "^" }, (params) => this.scrollDown(params));
    this._parser.registerCsiHandler({ final: "`" }, (params) => this.charPosAbsolute(params));
    this._parser.registerCsiHandler({ final: "a" }, (params) => this.hPositionRelative(params));
    this._parser.registerCsiHandler({ final: "b" }, (params) => this.repeatPrecedingCharacter(params));
    this._parser.registerCsiHandler({ final: "c" }, (params) => this.sendDeviceAttributesPrimary(params));
    this._parser.registerCsiHandler({ prefix: ">", final: "c" }, (params) => this.sendDeviceAttributesSecondary(params));
    this._parser.registerCsiHandler({ final: "d" }, (params) => this.linePosAbsolute(params));
    this._parser.registerCsiHandler({ final: "e" }, (params) => this.vPositionRelative(params));
    this._parser.registerCsiHandler({ final: "f" }, (params) => this.hVPosition(params));
    this._parser.registerCsiHandler({ final: "g" }, (params) => this.tabClear(params));
    this._parser.registerCsiHandler({ final: "h" }, (params) => this.setMode(params));
    this._parser.registerCsiHandler({ prefix: "?", final: "h" }, (params) => this.setModePrivate(params));
    this._parser.registerCsiHandler({ final: "l" }, (params) => this.resetMode(params));
    this._parser.registerCsiHandler({ prefix: "?", final: "l" }, (params) => this.resetModePrivate(params));
    this._parser.registerCsiHandler({ final: "m" }, (params) => this.charAttributes(params));
    this._parser.registerCsiHandler({ final: "n" }, (params) => this.deviceStatus(params));
    this._parser.registerCsiHandler({ prefix: "?", final: "n" }, (params) => this.deviceStatusPrivate(params));
    this._parser.registerCsiHandler({ intermediates: "!", final: "p" }, (params) => this.softReset(params));
    this._parser.registerCsiHandler({ prefix: ">", final: "q" }, (params) => this.sendXtVersion(params));
    this._parser.registerCsiHandler({ intermediates: " ", final: "q" }, (params) => this.setCursorStyle(params));
    this._parser.registerCsiHandler({ final: "r" }, (params) => this.setScrollRegion(params));
    this._parser.registerCsiHandler({ final: "s" }, (params) => this.saveCursor(params));
    this._parser.registerCsiHandler({ final: "t" }, (params) => this.windowOptions(params));
    this._parser.registerCsiHandler({ final: "u" }, (params) => this.restoreCursor(params));
    this._parser.registerCsiHandler({ intermediates: "'", final: "}" }, (params) => this.insertColumns(params));
    this._parser.registerCsiHandler({ intermediates: "'", final: "~" }, (params) => this.deleteColumns(params));
    this._parser.registerCsiHandler({ intermediates: '"', final: "q" }, (params) => this.selectProtected(params));
    this._parser.registerCsiHandler({ intermediates: "$", final: "p" }, (params) => this.requestMode(params, true));
    this._parser.registerCsiHandler({ prefix: "?", intermediates: "$", final: "p" }, (params) => this.requestMode(params, false));
    this._parser.registerCsiHandler({ prefix: "=", final: "u" }, (params) => this.kittyKeyboardSet(params));
    this._parser.registerCsiHandler({ prefix: "?", final: "u" }, (params) => this.kittyKeyboardQuery(params));
    this._parser.registerCsiHandler({ prefix: ">", final: "u" }, (params) => this.kittyKeyboardPush(params));
    this._parser.registerCsiHandler({ prefix: "<", final: "u" }, (params) => this.kittyKeyboardPop(params));
    this._parser.setExecuteHandler("\x07" /* BEL */, () => this.bell());
    this._parser.setExecuteHandler("\n" /* LF */, () => this.lineFeed());
    this._parser.setExecuteHandler("\v" /* VT */, () => this.lineFeed());
    this._parser.setExecuteHandler("\f" /* FF */, () => this.lineFeed());
    this._parser.setExecuteHandler("\r" /* CR */, () => this.carriageReturn());
    this._parser.setExecuteHandler("\b" /* BS */, () => this.backspace());
    this._parser.setExecuteHandler("	" /* HT */, () => this.tab());
    this._parser.setExecuteHandler("" /* SO */, () => this.shiftOut());
    this._parser.setExecuteHandler("" /* SI */, () => this.shiftIn());
    this._parser.setExecuteHandler("\x84" /* IND */, () => this.index());
    this._parser.setExecuteHandler("\x85" /* NEL */, () => this.nextLine());
    this._parser.setExecuteHandler("\x88" /* HTS */, () => this.tabSet());
    this._parser.registerOscHandler(0, new OscHandler((data) => {
      this.setTitle(data);
      this.setIconName(data);
      return true;
    }));
    this._parser.registerOscHandler(1, new OscHandler((data) => this.setIconName(data)));
    this._parser.registerOscHandler(2, new OscHandler((data) => this.setTitle(data)));
    this._parser.registerOscHandler(4, new OscHandler((data) => this.setOrReportIndexedColor(data)));
    this._parser.registerOscHandler(8, new OscHandler((data) => this.setHyperlink(data)));
    this._parser.registerOscHandler(10, new OscHandler((data) => this.setOrReportFgColor(data)));
    this._parser.registerOscHandler(11, new OscHandler((data) => this.setOrReportBgColor(data)));
    this._parser.registerOscHandler(12, new OscHandler((data) => this.setOrReportCursorColor(data)));
    this._parser.registerOscHandler(104, new OscHandler((data) => this.restoreIndexedColor(data)));
    this._parser.registerOscHandler(110, new OscHandler((data) => this.restoreFgColor(data)));
    this._parser.registerOscHandler(111, new OscHandler((data) => this.restoreBgColor(data)));
    this._parser.registerOscHandler(112, new OscHandler((data) => this.restoreCursorColor(data)));
    this._parser.registerEscHandler({ final: "7" }, () => this.saveCursor());
    this._parser.registerEscHandler({ final: "8" }, () => this.restoreCursor());
    this._parser.registerEscHandler({ final: "D" }, () => this.index());
    this._parser.registerEscHandler({ final: "E" }, () => this.nextLine());
    this._parser.registerEscHandler({ final: "H" }, () => this.tabSet());
    this._parser.registerEscHandler({ final: "M" }, () => this.reverseIndex());
    this._parser.registerEscHandler({ final: "=" }, () => this.keypadApplicationMode());
    this._parser.registerEscHandler({ final: ">" }, () => this.keypadNumericMode());
    this._parser.registerEscHandler({ final: "c" }, () => this.fullReset());
    this._parser.registerEscHandler({ final: "n" }, () => this.setgLevel(2));
    this._parser.registerEscHandler({ final: "o" }, () => this.setgLevel(3));
    this._parser.registerEscHandler({ final: "|" }, () => this.setgLevel(3));
    this._parser.registerEscHandler({ final: "}" }, () => this.setgLevel(2));
    this._parser.registerEscHandler({ final: "~" }, () => this.setgLevel(1));
    this._parser.registerEscHandler({ intermediates: "%", final: "@" }, () => this.selectDefaultCharset());
    this._parser.registerEscHandler({ intermediates: "%", final: "G" }, () => this.selectDefaultCharset());
    for (const flag in CHARSETS) {
      this._parser.registerEscHandler({ intermediates: "(", final: flag }, () => this.selectCharset("(" + flag));
      this._parser.registerEscHandler({ intermediates: ")", final: flag }, () => this.selectCharset(")" + flag));
      this._parser.registerEscHandler({ intermediates: "*", final: flag }, () => this.selectCharset("*" + flag));
      this._parser.registerEscHandler({ intermediates: "+", final: flag }, () => this.selectCharset("+" + flag));
      this._parser.registerEscHandler({ intermediates: "-", final: flag }, () => this.selectCharset("-" + flag));
      this._parser.registerEscHandler({ intermediates: ".", final: flag }, () => this.selectCharset("." + flag));
      this._parser.registerEscHandler({ intermediates: "/", final: flag }, () => this.selectCharset("/" + flag));
    }
    this._parser.registerEscHandler({ intermediates: "#", final: "8" }, () => this.screenAlignmentPattern());
    this._parser.setErrorHandler((state) => {
      this._logService.error("Parsing error: ", state);
      return state;
    });
    this._parser.registerDcsHandler({ intermediates: "$", final: "q" }, new DcsHandler((data, params) => this.requestStatusString(data, params)));
  }
  getAttrData() {
    return this._curAttrData;
  }
  /**
   * Async parse support.
   */
  _preserveStack(cursorStartX, cursorStartY, decodedLength, position) {
    this._parseStack.paused = true;
    this._parseStack.cursorStartX = cursorStartX;
    this._parseStack.cursorStartY = cursorStartY;
    this._parseStack.decodedLength = decodedLength;
    this._parseStack.position = position;
  }
  _logSlowResolvingAsync(p) {
    if (this._logService.logLevel <= 3 /* WARN */) {
      let slowTimeout;
      const slowPromise = new Promise((_res, rej) => {
        slowTimeout = setTimeout(() => rej("#SLOW_TIMEOUT"), 5e3 /* SLOW_ASYNC_LIMIT */);
      });
      Promise.race([p, slowPromise]).then(() => {
        if (slowTimeout !== void 0) {
          clearTimeout(slowTimeout);
        }
      }, (err) => {
        if (slowTimeout !== void 0) {
          clearTimeout(slowTimeout);
        }
        if (err !== "#SLOW_TIMEOUT") {
          throw err;
        }
        console.warn(`async parser handler taking longer than ${5e3 /* SLOW_ASYNC_LIMIT */} ms`);
      });
    }
  }
  _getCurrentLinkId() {
    return this._curAttrData.extended.urlId;
  }
  /**
   * Parse call with async handler support.
   *
   * Whether the stack state got preserved for the next call, is indicated by the return value:
   * - undefined (void):
   *   all handlers were sync, no stack save, continue normally with next chunk
   * - Promise\<boolean\>:
   *   execution stopped at async handler, stack saved, continue with same chunk and the promise
   *   resolve value as `promiseResult` until the method returns `undefined`
   *
   * Note: This method should only be called by `Terminal.write` to ensure correct execution order
   * and proper continuation of async parser handlers.
   */
  parse(data, promiseResult) {
    let result;
    let cursorStartX = this._activeBuffer.x;
    let cursorStartY = this._activeBuffer.y;
    let start = 0;
    const wasPaused = this._parseStack.paused;
    if (wasPaused) {
      if (result = this._parser.parse(this._parseBuffer, this._parseStack.decodedLength, promiseResult)) {
        this._logSlowResolvingAsync(result);
        return result;
      }
      cursorStartX = this._parseStack.cursorStartX;
      cursorStartY = this._parseStack.cursorStartY;
      this._parseStack.paused = false;
      if (data.length > 131072 /* MAX_PARSEBUFFER_LENGTH */) {
        start = this._parseStack.position + 131072 /* MAX_PARSEBUFFER_LENGTH */;
      }
    }
    if (this._logService.logLevel <= 1 /* DEBUG */) {
      this._logService.debug(`parsing data ${typeof data === "string" ? ` "${data}"` : ` "${Array.prototype.map.call(data, (e) => String.fromCharCode(e)).join("")}"`}`);
    }
    if (this._logService.logLevel === 0 /* TRACE */) {
      this._logService.trace(
        `parsing data (codes)`,
        typeof data === "string" ? data.split("").map((e) => e.charCodeAt(0)) : data
      );
    }
    if (this._parseBuffer.length < data.length) {
      if (this._parseBuffer.length < 131072 /* MAX_PARSEBUFFER_LENGTH */) {
        this._parseBuffer = new Uint32Array(Math.min(data.length, 131072 /* MAX_PARSEBUFFER_LENGTH */));
      }
    }
    if (!wasPaused) {
      this._dirtyRowTracker.clearRange();
    }
    if (data.length > 131072 /* MAX_PARSEBUFFER_LENGTH */) {
      for (let i = start; i < data.length; i += 131072 /* MAX_PARSEBUFFER_LENGTH */) {
        const end = i + 131072 /* MAX_PARSEBUFFER_LENGTH */ < data.length ? i + 131072 /* MAX_PARSEBUFFER_LENGTH */ : data.length;
        const len = typeof data === "string" ? this._stringDecoder.decode(data.substring(i, end), this._parseBuffer) : this._utf8Decoder.decode(data.subarray(i, end), this._parseBuffer);
        if (result = this._parser.parse(this._parseBuffer, len)) {
          this._preserveStack(cursorStartX, cursorStartY, len, i);
          this._logSlowResolvingAsync(result);
          return result;
        }
      }
    } else {
      if (!wasPaused) {
        const len = typeof data === "string" ? this._stringDecoder.decode(data, this._parseBuffer) : this._utf8Decoder.decode(data, this._parseBuffer);
        if (result = this._parser.parse(this._parseBuffer, len)) {
          this._preserveStack(cursorStartX, cursorStartY, len, 0);
          this._logSlowResolvingAsync(result);
          return result;
        }
      }
    }
    if (this._activeBuffer.x !== cursorStartX || this._activeBuffer.y !== cursorStartY) {
      this._onCursorMove.fire();
    }
    const viewportEnd = this._dirtyRowTracker.end + (this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
    const viewportStart = this._dirtyRowTracker.start + (this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
    if (viewportStart < this._bufferService.rows) {
      this._onRequestRefreshRows.fire({
        start: Math.min(viewportStart, this._bufferService.rows - 1),
        end: Math.min(viewportEnd, this._bufferService.rows - 1)
      });
    }
  }
  print(data, start, end) {
    let code;
    let chWidth;
    const charset = this._charsetService.charset;
    const screenReaderMode = this._optionsService.rawOptions.screenReaderMode;
    const cols = this._bufferService.cols;
    const wraparoundMode = this._coreService.decPrivateModes.wraparound;
    const insertMode = this._coreService.modes.insertMode;
    const curAttr = this._curAttrData;
    let bufferRow = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
    if (!bufferRow) {
      return;
    }
    this._dirtyRowTracker.markDirty(this._activeBuffer.y);
    if (this._activeBuffer.x && end - start > 0 && bufferRow.getWidth(this._activeBuffer.x - 1) === 2) {
      bufferRow.setCellFromCodepoint(this._activeBuffer.x - 1, 0, 1, curAttr);
    }
    let precedingJoinState = this._parser.precedingJoinState;
    for (let pos = start; pos < end; ++pos) {
      code = data[pos];
      if (code === 173) {
        continue;
      }
      if (code < 127 && charset) {
        const ch = charset[String.fromCharCode(code)];
        if (ch) {
          code = ch.charCodeAt(0);
        }
      }
      const currentInfo = this._unicodeService.charProperties(code, precedingJoinState);
      chWidth = UnicodeService.extractWidth(currentInfo);
      const shouldJoin = UnicodeService.extractShouldJoin(currentInfo);
      const oldWidth = shouldJoin ? UnicodeService.extractWidth(precedingJoinState) : 0;
      precedingJoinState = currentInfo;
      if (screenReaderMode) {
        this._onA11yChar.fire(stringFromCodePoint(code));
      }
      const linkId = this._getCurrentLinkId();
      if (linkId) {
        this._oscLinkService.addLineToLink(linkId, this._activeBuffer.ybase + this._activeBuffer.y);
      }
      if (this._activeBuffer.x + chWidth - oldWidth > cols) {
        if (wraparoundMode) {
          const oldRow = bufferRow;
          let oldCol = this._activeBuffer.x - oldWidth;
          this._activeBuffer.x = oldWidth;
          this._activeBuffer.y++;
          if (this._activeBuffer.y === this._activeBuffer.scrollBottom + 1) {
            this._activeBuffer.y--;
            this._bufferService.scroll(this._eraseAttrData(), true);
          } else {
            if (this._activeBuffer.y >= this._bufferService.rows) {
              this._activeBuffer.y = this._bufferService.rows - 1;
            }
            this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = true;
          }
          bufferRow = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
          if (!bufferRow) {
            return;
          }
          if (oldWidth > 0 && bufferRow instanceof BufferLine) {
            bufferRow.copyCellsFrom(
              oldRow,
              oldCol,
              0,
              oldWidth,
              false
            );
          }
          while (oldCol < cols) {
            oldRow.setCellFromCodepoint(oldCol++, 0, 1, curAttr);
          }
        } else {
          this._activeBuffer.x = cols - 1;
          if (chWidth === 2) {
            continue;
          }
        }
      }
      if (shouldJoin && this._activeBuffer.x) {
        const offset = bufferRow.getWidth(this._activeBuffer.x - 1) ? 1 : 2;
        bufferRow.addCodepointToCell(
          this._activeBuffer.x - offset,
          code,
          chWidth
        );
        for (let delta = chWidth - oldWidth; --delta >= 0; ) {
          bufferRow.setCellFromCodepoint(this._activeBuffer.x++, 0, 0, curAttr);
        }
        continue;
      }
      if (insertMode) {
        bufferRow.insertCells(this._activeBuffer.x, chWidth - oldWidth, this._activeBuffer.getNullCell(curAttr));
        if (bufferRow.getWidth(cols - 1) === 2) {
          bufferRow.setCellFromCodepoint(cols - 1, NULL_CELL_CODE, NULL_CELL_WIDTH, curAttr);
        }
      }
      bufferRow.setCellFromCodepoint(this._activeBuffer.x++, code, chWidth, curAttr);
      if (chWidth > 0) {
        while (--chWidth) {
          bufferRow.setCellFromCodepoint(this._activeBuffer.x++, 0, 0, curAttr);
        }
      }
    }
    this._parser.precedingJoinState = precedingJoinState;
    if (this._activeBuffer.x < cols && end - start > 0 && bufferRow.getWidth(this._activeBuffer.x) === 0 && !bufferRow.hasContent(this._activeBuffer.x)) {
      bufferRow.setCellFromCodepoint(this._activeBuffer.x, 0, 1, curAttr);
    }
    this._dirtyRowTracker.markDirty(this._activeBuffer.y);
  }
  /**
   * Forward registerCsiHandler from parser.
   */
  registerCsiHandler(id, callback) {
    if (id.final === "t" && !id.prefix && !id.intermediates) {
      return this._parser.registerCsiHandler(id, (params) => {
        if (!paramToWindowOption(params.params[0], this._optionsService.rawOptions.windowOptions)) {
          return true;
        }
        return callback(params);
      });
    }
    return this._parser.registerCsiHandler(id, callback);
  }
  /**
   * Forward registerDcsHandler from parser.
   */
  registerDcsHandler(id, callback) {
    return this._parser.registerDcsHandler(id, new DcsHandler(callback));
  }
  /**
   * Forward registerEscHandler from parser.
   */
  registerEscHandler(id, callback) {
    return this._parser.registerEscHandler(id, callback);
  }
  /**
   * Forward registerOscHandler from parser.
   */
  registerOscHandler(ident, callback) {
    return this._parser.registerOscHandler(ident, new OscHandler(callback));
  }
  /**
   * Forward registerApcHandler from parser.
   */
  registerApcHandler(id, callback) {
    return this._parser.registerApcHandler(id, new ApcHandler(callback));
  }
  /**
   * BEL
   * Bell (Ctrl-G).
   *
   * @vt: #Y   C0    BEL   "Bell"  "\a, \x07"  "Ring the bell."
   * The behavior of the bell is further customizable with `ITerminalOptions.bellStyle`
   * and `ITerminalOptions.bellSound`.
   */
  bell() {
    this._onRequestBell.fire();
    return true;
  }
  /**
   * LF
   * Line Feed or New Line (NL).  (LF  is Ctrl-J).
   *
   * @vt: #Y   C0    LF   "Line Feed"            "\n, \x0A"  "Move the cursor one row down, scrolling if needed."
   * Scrolling is restricted to scroll margins and will only happen on the bottom line.
   *
   * @vt: #Y   C0    VT   "Vertical Tabulation"  "\v, \x0B"  "Treated as LF."
   * @vt: #Y   C0    FF   "Form Feed"            "\f, \x0C"  "Treated as LF."
   */
  lineFeed() {
    this._dirtyRowTracker.markDirty(this._activeBuffer.y);
    if (this._optionsService.rawOptions.convertEol) {
      this._activeBuffer.x = 0;
    }
    this._activeBuffer.y++;
    if (this._activeBuffer.y === this._activeBuffer.scrollBottom + 1) {
      this._activeBuffer.y--;
      this._bufferService.scroll(this._eraseAttrData());
    } else if (this._activeBuffer.y >= this._bufferService.rows) {
      this._activeBuffer.y = this._bufferService.rows - 1;
    } else {
      this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = false;
    }
    if (this._activeBuffer.x >= this._bufferService.cols) {
      this._activeBuffer.x--;
    }
    this._dirtyRowTracker.markDirty(this._activeBuffer.y);
    this._onLineFeed.fire();
    return true;
  }
  /**
   * CR
   * Carriage Return (Ctrl-M).
   *
   * @vt: #Y   C0    CR   "Carriage Return"  "\r, \x0D"  "Move the cursor to the beginning of the row."
   */
  carriageReturn() {
    this._activeBuffer.x = 0;
    return true;
  }
  /**
   * BS
   * Backspace (Ctrl-H).
   *
   * @vt: #Y   C0    BS   "Backspace"  "\b, \x08"  "Move the cursor one position to the left."
   * By default it is not possible to move the cursor past the leftmost position.
   * If `reverse wrap-around` (`CSI ? 45 h`) is set, a previous soft line wrap (DECAWM)
   * can be undone with BS within the scroll margins. In that case the cursor will wrap back
   * to the end of the previous row. Note that it is not possible to peek back into the scrollbuffer
   * with the cursor, thus at the home position (top-leftmost cell) this has no effect.
   */
  backspace() {
    if (!this._coreService.decPrivateModes.reverseWraparound) {
      this._restrictCursor();
      if (this._activeBuffer.x > 0) {
        this._activeBuffer.x--;
      }
      return true;
    }
    this._restrictCursor(this._bufferService.cols);
    if (this._activeBuffer.x > 0) {
      this._activeBuffer.x--;
    } else {
      if (this._activeBuffer.x === 0 && this._activeBuffer.y > this._activeBuffer.scrollTop && this._activeBuffer.y <= this._activeBuffer.scrollBottom && this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y)?.isWrapped) {
        this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = false;
        this._activeBuffer.y--;
        this._activeBuffer.x = this._bufferService.cols - 1;
        const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
        if (line.hasWidth(this._activeBuffer.x) && !line.hasContent(this._activeBuffer.x)) {
          this._activeBuffer.x--;
        }
      }
    }
    this._restrictCursor();
    return true;
  }
  /**
   * TAB
   * Horizontal Tab (HT) (Ctrl-I).
   *
   * @vt: #Y   C0    HT   "Horizontal Tabulation"  "\t, \x09"  "Move the cursor to the next character tab stop."
   */
  tab() {
    if (this._activeBuffer.x >= this._bufferService.cols) {
      return true;
    }
    const originalX = this._activeBuffer.x;
    this._activeBuffer.x = this._activeBuffer.nextStop();
    if (this._optionsService.rawOptions.screenReaderMode) {
      this._onA11yTab.fire(this._activeBuffer.x - originalX);
    }
    return true;
  }
  /**
   * SO
   * Shift Out (Ctrl-N) -> Switch to Alternate Character Set.  This invokes the
   * G1 character set.
   *
   * @vt: #P[Only limited ISO-2022 charset support.]  C0    SO   "Shift Out"  "\x0E"  "Switch to an alternative character set."
   */
  shiftOut() {
    this._charsetService.setgLevel(1);
    return true;
  }
  /**
   * SI
   * Shift In (Ctrl-O) -> Switch to Standard Character Set.  This invokes the G0
   * character set (the default).
   *
   * @vt: #Y   C0    SI   "Shift In"   "\x0F"  "Return to regular character set after Shift Out."
   */
  shiftIn() {
    this._charsetService.setgLevel(0);
    return true;
  }
  /**
   * Restrict cursor to viewport size / scroll margin (origin mode).
   */
  _restrictCursor(maxCol = this._bufferService.cols - 1) {
    this._activeBuffer.x = Math.min(maxCol, Math.max(0, this._activeBuffer.x));
    this._activeBuffer.y = this._coreService.decPrivateModes.origin ? Math.min(this._activeBuffer.scrollBottom, Math.max(this._activeBuffer.scrollTop, this._activeBuffer.y)) : Math.min(this._bufferService.rows - 1, Math.max(0, this._activeBuffer.y));
    this._dirtyRowTracker.markDirty(this._activeBuffer.y);
  }
  /**
   * Set absolute cursor position.
   */
  _setCursor(x, y) {
    this._dirtyRowTracker.markDirty(this._activeBuffer.y);
    if (this._coreService.decPrivateModes.origin) {
      this._activeBuffer.x = x;
      this._activeBuffer.y = this._activeBuffer.scrollTop + y;
    } else {
      this._activeBuffer.x = x;
      this._activeBuffer.y = y;
    }
    this._restrictCursor();
    this._dirtyRowTracker.markDirty(this._activeBuffer.y);
  }
  /**
   * Set relative cursor position.
   */
  _moveCursor(x, y) {
    this._restrictCursor();
    this._setCursor(this._activeBuffer.x + x, this._activeBuffer.y + y);
  }
  /**
   * CSI Ps A
   * Cursor Up Ps Times (default = 1) (CUU).
   *
   * @vt: #Y CSI CUU   "Cursor Up"   "CSI Ps A"  "Move cursor `Ps` times up (default=1)."
   * If the cursor would pass the top scroll margin, it will stop there.
   */
  cursorUp(params) {
    const diffToTop = this._activeBuffer.y - this._activeBuffer.scrollTop;
    if (diffToTop >= 0) {
      this._moveCursor(0, -Math.min(diffToTop, params.params[0] || 1));
    } else {
      this._moveCursor(0, -(params.params[0] || 1));
    }
    return true;
  }
  /**
   * CSI Ps B
   * Cursor Down Ps Times (default = 1) (CUD).
   *
   * @vt: #Y CSI CUD   "Cursor Down"   "CSI Ps B"  "Move cursor `Ps` times down (default=1)."
   * If the cursor would pass the bottom scroll margin, it will stop there.
   */
  cursorDown(params) {
    const diffToBottom = this._activeBuffer.scrollBottom - this._activeBuffer.y;
    if (diffToBottom >= 0) {
      this._moveCursor(0, Math.min(diffToBottom, params.params[0] || 1));
    } else {
      this._moveCursor(0, params.params[0] || 1);
    }
    return true;
  }
  /**
   * CSI Ps C
   * Cursor Forward Ps Times (default = 1) (CUF).
   *
   * @vt: #Y CSI CUF   "Cursor Forward"    "CSI Ps C"  "Move cursor `Ps` times forward (default=1)."
   */
  cursorForward(params) {
    this._moveCursor(params.params[0] || 1, 0);
    return true;
  }
  /**
   * CSI Ps D
   * Cursor Backward Ps Times (default = 1) (CUB).
   *
   * @vt: #Y CSI CUB   "Cursor Backward"   "CSI Ps D"  "Move cursor `Ps` times backward (default=1)."
   */
  cursorBackward(params) {
    this._moveCursor(-(params.params[0] || 1), 0);
    return true;
  }
  /**
   * CSI Ps E
   * Cursor Next Line Ps Times (default = 1) (CNL).
   * Other than cursorDown (CUD) also set the cursor to first column.
   *
   * @vt: #Y CSI CNL   "Cursor Next Line"  "CSI Ps E"  "Move cursor `Ps` times down (default=1) and to the first column."
   * Same as CUD, additionally places the cursor at the first column.
   */
  cursorNextLine(params) {
    this.cursorDown(params);
    this._activeBuffer.x = 0;
    return true;
  }
  /**
   * CSI Ps F
   * Cursor Previous Line Ps Times (default = 1) (CPL).
   * Other than cursorUp (CUU) also set the cursor to first column.
   *
   * @vt: #Y CSI CPL   "Cursor Backward"   "CSI Ps F"  "Move cursor `Ps` times up (default=1) and to the first column."
   * Same as CUU, additionally places the cursor at the first column.
   */
  cursorPrecedingLine(params) {
    this.cursorUp(params);
    this._activeBuffer.x = 0;
    return true;
  }
  /**
   * CSI Ps G
   * Cursor Character Absolute  [column] (default = [row,1]) (CHA).
   *
   * @vt: #Y CSI CHA   "Cursor Horizontal Absolute" "CSI Ps G" "Move cursor to `Ps`-th column of the active row (default=1)."
   */
  cursorCharAbsolute(params) {
    this._setCursor((params.params[0] || 1) - 1, this._activeBuffer.y);
    return true;
  }
  /**
   * CSI Ps ; Ps H
   * Cursor Position [row;column] (default = [1,1]) (CUP).
   *
   * @vt: #Y CSI CUP   "Cursor Position"   "CSI Ps ; Ps H"  "Set cursor to position [`Ps`, `Ps`] (default = [1, 1])."
   * If ORIGIN mode is set, places the cursor to the absolute position within the scroll margins.
   * If ORIGIN mode is not set, places the cursor to the absolute position within the viewport.
   * Note that the coordinates are 1-based, thus the top left position starts at `1 ; 1`.
   */
  cursorPosition(params) {
    this._setCursor(
      // col
      params.length >= 2 ? (params.params[1] || 1) - 1 : 0,
      // row
      (params.params[0] || 1) - 1
    );
    return true;
  }
  /**
   * CSI Pm `  Character Position Absolute
   *   [column] (default = [row,1]) (HPA).
   * Currently same functionality as CHA.
   *
   * @vt: #Y CSI HPA   "Horizontal Position Absolute"  "CSI Ps ` " "Same as CHA."
   */
  charPosAbsolute(params) {
    this._setCursor((params.params[0] || 1) - 1, this._activeBuffer.y);
    return true;
  }
  /**
   * CSI Pm a  Character Position Relative
   *   [columns] (default = [row,col+1]) (HPR)
   *
   * @vt: #Y CSI HPR   "Horizontal Position Relative"  "CSI Ps a"  "Same as CUF."
   */
  hPositionRelative(params) {
    this._moveCursor(params.params[0] || 1, 0);
    return true;
  }
  /**
   * CSI Pm d  Vertical Position Absolute (VPA)
   *   [row] (default = [1,column])
   *
   * @vt: #Y CSI VPA   "Vertical Position Absolute"    "CSI Ps d"  "Move cursor to `Ps`-th row (default=1)."
   */
  linePosAbsolute(params) {
    this._setCursor(this._activeBuffer.x, (params.params[0] || 1) - 1);
    return true;
  }
  /**
   * CSI Pm e  Vertical Position Relative (VPR)
   *   [rows] (default = [row+1,column])
   * reuse CSI Ps B ?
   *
   * @vt: #Y CSI VPR   "Vertical Position Relative"    "CSI Ps e"  "Move cursor `Ps` times down (default=1)."
   */
  vPositionRelative(params) {
    this._moveCursor(0, params.params[0] || 1);
    return true;
  }
  /**
   * CSI Ps ; Ps f
   *   Horizontal and Vertical Position [row;column] (default =
   *   [1,1]) (HVP).
   *   Same as CUP.
   *
   * @vt: #Y CSI HVP   "Horizontal and Vertical Position" "CSI Ps ; Ps f"  "Same as CUP."
   */
  hVPosition(params) {
    this.cursorPosition(params);
    return true;
  }
  /**
   * CSI Ps g  Tab Clear (TBC).
   *     Ps = 0  -> Clear Current Column (default).
   *     Ps = 3  -> Clear All.
   * Potentially:
   *   Ps = 2  -> Clear Stops on Line.
   *   http://vt100.net/annarbor/aaa-ug/section6.html
   *
   * @vt: #Y CSI TBC   "Tab Clear" "CSI Ps g"  "Clear tab stops at current position (0) or all (3) (default=0)."
   * Clearing tabstops off the active row (Ps = 2, VT100) is currently not supported.
   */
  tabClear(params) {
    const param = params.params[0];
    if (param === 0) {
      delete this._activeBuffer.tabs[this._activeBuffer.x];
    } else if (param === 3) {
      this._activeBuffer.tabs = {};
    }
    return true;
  }
  /**
   * CSI Ps I
   *   Cursor Forward Tabulation Ps tab stops (default = 1) (CHT).
   *
   * @vt: #Y CSI CHT   "Cursor Horizontal Tabulation" "CSI Ps I" "Move cursor `Ps` times tabs forward (default=1)."
   */
  cursorForwardTab(params) {
    if (this._activeBuffer.x >= this._bufferService.cols) {
      return true;
    }
    let param = params.params[0] || 1;
    while (param--) {
      this._activeBuffer.x = this._activeBuffer.nextStop();
    }
    return true;
  }
  /**
   * CSI Ps Z  Cursor Backward Tabulation Ps tab stops (default = 1) (CBT).
   *
   * @vt: #Y CSI CBT   "Cursor Backward Tabulation"  "CSI Ps Z"  "Move cursor `Ps` tabs backward (default=1)."
   */
  cursorBackwardTab(params) {
    if (this._activeBuffer.x >= this._bufferService.cols) {
      return true;
    }
    let param = params.params[0] || 1;
    while (param--) {
      this._activeBuffer.x = this._activeBuffer.prevStop();
    }
    return true;
  }
  /**
   * CSI Ps " q  Select Character Protection Attribute (DECSCA).
   *
   * @vt: #Y CSI DECSCA   "Select Character Protection Attribute"  "CSI Ps " q"  "Whether DECSED and DECSEL can erase (0=default, 2) or not (1)."
   */
  selectProtected(params) {
    const p = params.params[0];
    if (p === 1) this._curAttrData.bg |= 536870912 /* PROTECTED */;
    if (p === 2 || p === 0) this._curAttrData.bg &= ~536870912 /* PROTECTED */;
    return true;
  }
  /**
   * Helper method to erase cells in a terminal row.
   * The cell gets replaced with the eraseChar of the terminal.
   * @param y The row index relative to the viewport.
   * @param start The start x index of the range to be erased.
   * @param end The end x index of the range to be erased (exclusive).
   * @param clearWrap clear the isWrapped flag
   * @param respectProtect Whether to respect the protection attribute (DECSCA).
   */
  _eraseInBufferLine(y, start, end, clearWrap = false, respectProtect = false) {
    const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + y);
    if (!line) {
      return;
    }
    line.replaceCells(
      start,
      end,
      this._activeBuffer.getNullCell(this._eraseAttrData()),
      respectProtect
    );
    if (clearWrap) {
      line.isWrapped = false;
    }
  }
  /**
   * Helper method to reset cells in a terminal row. The cell gets replaced with the eraseChar of
   * the terminal and the isWrapped property is set to false.
   * @param y row index
   */
  _resetBufferLine(y, respectProtect = false) {
    const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + y);
    if (line) {
      line.fill(this._activeBuffer.getNullCell(this._eraseAttrData()), respectProtect);
      this._bufferService.buffer.clearMarkers(this._activeBuffer.ybase + y);
      line.isWrapped = false;
    }
  }
  /**
   * CSI Ps J  Erase in Display (ED).
   *     Ps = 0  -> Erase Below (default).
   *     Ps = 1  -> Erase Above.
   *     Ps = 2  -> Erase All.
   *     Ps = 3  -> Erase Saved Lines (xterm).
   * CSI ? Ps J
   *   Erase in Display (DECSED).
   *     Ps = 0  -> Selective Erase Below (default).
   *     Ps = 1  -> Selective Erase Above.
   *     Ps = 2  -> Selective Erase All.
   *
   * @vt: #Y CSI ED  "Erase In Display"  "CSI Ps J"  "Erase various parts of the viewport."
   * Supported param values:
   *
   * | Ps | Effect                                                       |
   * | -- | ------------------------------------------------------------ |
   * | 0  | Erase from the cursor through the end of the viewport.       |
   * | 1  | Erase from the beginning of the viewport through the cursor. |
   * | 2  | Erase complete viewport.                                     |
   * | 3  | Erase scrollback.                                            |
   *
   * @vt: #Y CSI DECSED   "Selective Erase In Display"  "CSI ? Ps J"  "Same as ED with respecting protection flag."
   */
  eraseInDisplay(params, respectProtect = false) {
    this._restrictCursor(this._bufferService.cols);
    let j;
    switch (params.params[0]) {
      case 0:
        j = this._activeBuffer.y;
        this._dirtyRowTracker.markDirty(j);
        this._eraseInBufferLine(j++, this._activeBuffer.x, this._bufferService.cols, this._activeBuffer.x === 0, respectProtect);
        for (; j < this._bufferService.rows; j++) {
          this._resetBufferLine(j, respectProtect);
        }
        this._dirtyRowTracker.markDirty(j);
        break;
      case 1:
        j = this._activeBuffer.y;
        this._dirtyRowTracker.markDirty(j);
        this._eraseInBufferLine(j, 0, this._activeBuffer.x + 1, true, respectProtect);
        if (this._activeBuffer.x + 1 >= this._bufferService.cols) {
          const nextLine = this._activeBuffer.lines.get(j + 1);
          if (nextLine) {
            nextLine.isWrapped = false;
          }
        }
        while (j--) {
          this._resetBufferLine(j, respectProtect);
        }
        this._dirtyRowTracker.markDirty(0);
        break;
      case 2:
        if (this._optionsService.rawOptions.scrollOnEraseInDisplay) {
          j = this._bufferService.rows;
          this._dirtyRowTracker.markRangeDirty(0, j - 1);
          while (j--) {
            const currentLine = this._activeBuffer.lines.get(this._activeBuffer.ybase + j);
            if (currentLine?.getTrimmedLength()) {
              break;
            }
          }
          for (; j >= 0; j--) {
            this._bufferService.scroll(this._eraseAttrData());
          }
        } else {
          j = this._bufferService.rows;
          this._dirtyRowTracker.markDirty(j - 1);
          while (j--) {
            this._resetBufferLine(j, respectProtect);
          }
          this._dirtyRowTracker.markDirty(0);
        }
        break;
      case 3:
        const scrollBackSize = this._activeBuffer.lines.length - this._bufferService.rows;
        if (scrollBackSize > 0) {
          this._activeBuffer.lines.trimStart(scrollBackSize);
          this._activeBuffer.ybase = Math.max(this._activeBuffer.ybase - scrollBackSize, 0);
          this._activeBuffer.ydisp = Math.max(this._activeBuffer.ydisp - scrollBackSize, 0);
          this._onScroll.fire(0);
        }
        break;
    }
    return true;
  }
  /**
   * CSI Ps K  Erase in Line (EL).
   *     Ps = 0  -> Erase to Right (default).
   *     Ps = 1  -> Erase to Left.
   *     Ps = 2  -> Erase All.
   * CSI ? Ps K
   *   Erase in Line (DECSEL).
   *     Ps = 0  -> Selective Erase to Right (default).
   *     Ps = 1  -> Selective Erase to Left.
   *     Ps = 2  -> Selective Erase All.
   *
   * @vt: #Y CSI EL    "Erase In Line"  "CSI Ps K"  "Erase various parts of the active row."
   * Supported param values:
   *
   * | Ps | Effect                                                   |
   * | -- | -------------------------------------------------------- |
   * | 0  | Erase from the cursor through the end of the row.        |
   * | 1  | Erase from the beginning of the line through the cursor. |
   * | 2  | Erase complete line.                                     |
   *
   * @vt: #Y CSI DECSEL   "Selective Erase In Line"  "CSI ? Ps K"  "Same as EL with respecting protecting flag."
   */
  eraseInLine(params, respectProtect = false) {
    this._restrictCursor(this._bufferService.cols);
    switch (params.params[0]) {
      case 0:
        this._eraseInBufferLine(this._activeBuffer.y, this._activeBuffer.x, this._bufferService.cols, this._activeBuffer.x === 0, respectProtect);
        break;
      case 1:
        this._eraseInBufferLine(this._activeBuffer.y, 0, this._activeBuffer.x + 1, false, respectProtect);
        break;
      case 2:
        this._eraseInBufferLine(this._activeBuffer.y, 0, this._bufferService.cols, true, respectProtect);
        break;
    }
    this._dirtyRowTracker.markDirty(this._activeBuffer.y);
    return true;
  }
  /**
   * CSI Ps L
   * Insert Ps Line(s) (default = 1) (IL).
   *
   * @vt: #Y CSI IL  "Insert Line"   "CSI Ps L"  "Insert `Ps` blank lines at active row (default=1)."
   * For every inserted line at the scroll top one line at the scroll bottom gets removed.
   * The cursor is set to the first column.
   * IL has no effect if the cursor is outside the scroll margins.
   */
  insertLines(params) {
    this._restrictCursor();
    let param = params.params[0] || 1;
    if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) {
      return true;
    }
    const row = this._activeBuffer.ybase + this._activeBuffer.y;
    const scrollBottomRowsOffset = this._bufferService.rows - 1 - this._activeBuffer.scrollBottom;
    const scrollBottomAbsolute = this._bufferService.rows - 1 + this._activeBuffer.ybase - scrollBottomRowsOffset + 1;
    while (param--) {
      this._activeBuffer.lines.splice(scrollBottomAbsolute - 1, 1);
      this._activeBuffer.lines.splice(row, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
    }
    this._dirtyRowTracker.markRangeDirty(this._activeBuffer.y, this._activeBuffer.scrollBottom);
    this._activeBuffer.x = 0;
    return true;
  }
  /**
   * CSI Ps M
   * Delete Ps Line(s) (default = 1) (DL).
   *
   * @vt: #Y CSI DL  "Delete Line"   "CSI Ps M"  "Delete `Ps` lines at active row (default=1)."
   * For every deleted line at the scroll top one blank line at the scroll bottom gets appended.
   * The cursor is set to the first column.
   * DL has no effect if the cursor is outside the scroll margins.
   */
  deleteLines(params) {
    this._restrictCursor();
    let param = params.params[0] || 1;
    if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) {
      return true;
    }
    const row = this._activeBuffer.ybase + this._activeBuffer.y;
    let j;
    j = this._bufferService.rows - 1 - this._activeBuffer.scrollBottom;
    j = this._bufferService.rows - 1 + this._activeBuffer.ybase - j;
    while (param--) {
      this._activeBuffer.lines.splice(row, 1);
      this._activeBuffer.lines.splice(j, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
    }
    this._dirtyRowTracker.markRangeDirty(this._activeBuffer.y, this._activeBuffer.scrollBottom);
    this._activeBuffer.x = 0;
    return true;
  }
  /**
   * CSI Ps @
   * Insert Ps (Blank) Character(s) (default = 1) (ICH).
   *
   * @vt: #Y CSI ICH  "Insert Characters"   "CSI Ps @"  "Insert `Ps` (blank) characters (default = 1)."
   * The ICH sequence inserts `Ps` blank characters. The cursor remains at the beginning of the
   * blank characters. Text between the cursor and right margin moves to the right. Characters moved
   * past the right margin are lost.
   *
   *
   * FIXME: check against xterm - should not work outside of scroll margins (see VT520 manual)
   */
  insertChars(params) {
    this._restrictCursor();
    const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
    if (line) {
      line.insertCells(
        this._activeBuffer.x,
        params.params[0] || 1,
        this._activeBuffer.getNullCell(this._eraseAttrData())
      );
      this._dirtyRowTracker.markDirty(this._activeBuffer.y);
    }
    return true;
  }
  /**
   * CSI Ps P
   * Delete Ps Character(s) (default = 1) (DCH).
   *
   * @vt: #Y CSI DCH   "Delete Character"  "CSI Ps P"  "Delete `Ps` characters (default=1)."
   * As characters are deleted, the remaining characters between the cursor and right margin move to
   * the left. Character attributes move with the characters. The terminal adds blank characters at
   * the right margin.
   *
   *
   * FIXME: check against xterm - should not work outside of scroll margins (see VT520 manual)
   */
  deleteChars(params) {
    this._restrictCursor();
    const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
    if (line) {
      line.deleteCells(
        this._activeBuffer.x,
        params.params[0] || 1,
        this._activeBuffer.getNullCell(this._eraseAttrData())
      );
      this._dirtyRowTracker.markDirty(this._activeBuffer.y);
    }
    return true;
  }
  /**
   * CSI Ps S  Scroll up Ps lines (default = 1) (SU).
   *
   * @vt: #Y CSI SU  "Scroll Up"   "CSI Ps S"  "Scroll `Ps` lines up (default=1)."
   *
   *
   * FIXME: scrolled out lines at top = 1 should add to scrollback (xterm)
   */
  scrollUp(params) {
    let param = params.params[0] || 1;
    while (param--) {
      this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollTop, 1);
      this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollBottom, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
    }
    this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
    return true;
  }
  /**
   * CSI Ps T  Scroll down Ps lines (default = 1) (SD).
   *
   * @vt: #Y CSI SD  "Scroll Down"   "CSI Ps T"  "Scroll `Ps` lines down (default=1)."
   */
  scrollDown(params) {
    let param = params.params[0] || 1;
    while (param--) {
      this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollBottom, 1);
      this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollTop, 0, this._activeBuffer.getBlankLine(DEFAULT_ATTR_DATA));
    }
    this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
    return true;
  }
  /**
   * CSI Ps SP @  Scroll left Ps columns (default = 1) (SL) ECMA-48
   *
   * Notation: (Pn)
   * Representation: CSI Pn 02/00 04/00
   * Parameter default value: Pn = 1
   * SL causes the data in the presentation component to be moved by n character positions
   * if the line orientation is horizontal, or by n line positions if the line orientation
   * is vertical, such that the data appear to move to the left; where n equals the value of Pn.
   * The active presentation position is not affected by this control function.
   *
   * Supported:
   *   - always left shift (no line orientation setting respected)
   *
   * @vt: #Y CSI SL  "Scroll Left" "CSI Ps SP @" "Scroll viewport `Ps` times to the left."
   * SL moves the content of all lines within the scroll margins `Ps` times to the left.
   * SL has no effect outside of the scroll margins.
   */
  scrollLeft(params) {
    if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) {
      return true;
    }
    const param = params.params[0] || 1;
    for (let y = this._activeBuffer.scrollTop; y <= this._activeBuffer.scrollBottom; ++y) {
      const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + y);
      line.deleteCells(0, param, this._activeBuffer.getNullCell(this._eraseAttrData()));
      line.isWrapped = false;
    }
    this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
    return true;
  }
  /**
   * CSI Ps SP A  Scroll right Ps columns (default = 1) (SR) ECMA-48
   *
   * Notation: (Pn)
   * Representation: CSI Pn 02/00 04/01
   * Parameter default value: Pn = 1
   * SR causes the data in the presentation component to be moved by n character positions
   * if the line orientation is horizontal, or by n line positions if the line orientation
   * is vertical, such that the data appear to move to the right; where n equals the value of Pn.
   * The active presentation position is not affected by this control function.
   *
   * Supported:
   *   - always right shift (no line orientation setting respected)
   *
   * @vt: #Y CSI SR  "Scroll Right"  "CSI Ps SP A"   "Scroll viewport `Ps` times to the right."
   * SL moves the content of all lines within the scroll margins `Ps` times to the right.
   * Content at the right margin is lost.
   * SL has no effect outside of the scroll margins.
   */
  scrollRight(params) {
    if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) {
      return true;
    }
    const param = params.params[0] || 1;
    for (let y = this._activeBuffer.scrollTop; y <= this._activeBuffer.scrollBottom; ++y) {
      const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + y);
      line.insertCells(0, param, this._activeBuffer.getNullCell(this._eraseAttrData()));
      line.isWrapped = false;
    }
    this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
    return true;
  }
  /**
   * CSI Pm ' }
   * Insert Ps Column(s) (default = 1) (DECIC), VT420 and up.
   *
   * @vt: #Y CSI DECIC "Insert Columns"  "CSI Ps ' }"  "Insert `Ps` columns at cursor position."
   * DECIC inserts `Ps` times blank columns at the cursor position for all lines with the scroll
   * margins, moving content to the right. Content at the right margin is lost. DECIC has no effect
   * outside the scrolling margins.
   */
  insertColumns(params) {
    if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) {
      return true;
    }
    const param = params.params[0] || 1;
    for (let y = this._activeBuffer.scrollTop; y <= this._activeBuffer.scrollBottom; ++y) {
      const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + y);
      line.insertCells(this._activeBuffer.x, param, this._activeBuffer.getNullCell(this._eraseAttrData()));
      line.isWrapped = false;
    }
    this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
    return true;
  }
  /**
   * CSI Pm ' ~
   * Delete Ps Column(s) (default = 1) (DECDC), VT420 and up.
   *
   * @vt: #Y CSI DECDC "Delete Columns"  "CSI Ps ' ~"  "Delete `Ps` columns at cursor position."
   * DECDC deletes `Ps` times columns at the cursor position for all lines with the scroll margins,
   * moving content to the left. Blank columns are added at the right margin.
   * DECDC has no effect outside the scrolling margins.
   */
  deleteColumns(params) {
    if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) {
      return true;
    }
    const param = params.params[0] || 1;
    for (let y = this._activeBuffer.scrollTop; y <= this._activeBuffer.scrollBottom; ++y) {
      const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + y);
      line.deleteCells(this._activeBuffer.x, param, this._activeBuffer.getNullCell(this._eraseAttrData()));
      line.isWrapped = false;
    }
    this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
    return true;
  }
  /**
   * CSI Ps X
   * Erase Ps Character(s) (default = 1) (ECH).
   *
   * @vt: #Y CSI ECH   "Erase Character"   "CSI Ps X"  "Erase `Ps` characters from current cursor position to the right (default=1)."
   * ED erases `Ps` characters from current cursor position to the right.
   * ED works inside or outside the scrolling margins.
   */
  eraseChars(params) {
    this._restrictCursor();
    const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
    if (line) {
      line.replaceCells(
        this._activeBuffer.x,
        this._activeBuffer.x + (params.params[0] || 1),
        this._activeBuffer.getNullCell(this._eraseAttrData())
      );
      this._dirtyRowTracker.markDirty(this._activeBuffer.y);
    }
    return true;
  }
  /**
   * CSI Ps b  Repeat the preceding graphic character Ps times (REP).
   * From ECMA 48 (@see http://www.ecma-international.org/publications/files/ECMA-ST/Ecma-048.pdf)
   *    Notation: (Pn)
   *    Representation: CSI Pn 06/02
   *    Parameter default value: Pn = 1
   *    REP is used to indicate that the preceding character in the data stream,
   *    if it is a graphic character (represented by one or more bit combinations) including SPACE,
   *    is to be repeated n times, where n equals the value of Pn.
   *    If the character preceding REP is a control function or part of a control function,
   *    the effect of REP is not defined by this Standard.
   *
   * We extend xterm's behavior to allow repeating entire grapheme clusters.
   * This isn't 100% xterm-compatible, but it seems saner and more useful.
   *    - text attrs are applied normally
   *    - wrap around is respected
   *    - any valid sequence resets the carried forward char
   *
   * Note: To get reset on a valid sequence working correctly without much runtime penalty, the
   * preceding codepoint is stored on the parser in `this.print` and reset during `parser.parse`.
   *
   * @vt: #Y CSI REP   "Repeat Preceding Character"    "CSI Ps b"  "Repeat preceding character `Ps` times (default=1)."
   * REP repeats the previous character `Ps` times advancing the cursor, also wrapping if DECAWM is
   * set. REP has no effect if the sequence does not follow a printable ASCII character
   * (NOOP for any other sequence in between or NON ASCII characters).
   */
  repeatPrecedingCharacter(params) {
    const joinState = this._parser.precedingJoinState;
    if (!joinState) {
      return true;
    }
    const length = params.params[0] || 1;
    const chWidth = UnicodeService.extractWidth(joinState);
    const x = this._activeBuffer.x - chWidth;
    const bufferRow = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
    const text = bufferRow.getString(x);
    const data = new Uint32Array(text.length * length);
    let idata = 0;
    for (let itext = 0; itext < text.length; ) {
      const ch = text.codePointAt(itext) || 0;
      data[idata++] = ch;
      itext += ch > 65535 ? 2 : 1;
    }
    let tlength = idata;
    for (let i = 1; i < length; ++i) {
      data.copyWithin(tlength, 0, idata);
      tlength += idata;
    }
    this.print(data, 0, tlength);
    return true;
  }
  /**
   * CSI Ps c  Send Device Attributes (Primary DA).
   *     Ps = 0  or omitted -> request attributes from terminal.  The
   *     response depends on the decTerminalID resource setting.
   *     -> CSI ? 1 ; 2 c  (``VT100 with Advanced Video Option'')
   *     -> CSI ? 1 ; 0 c  (``VT101 with No Options'')
   *     -> CSI ? 6 c  (``VT102'')
   *     -> CSI ? 6 0 ; 1 ; 2 ; 6 ; 8 ; 9 ; 1 5 ; c  (``VT220'')
   *   The VT100-style response parameters do not mean anything by
   *   themselves.  VT220 parameters do, telling the host what fea-
   *   tures the terminal supports:
   *     Ps = 1  -> 132-columns.
   *     Ps = 2  -> Printer.
   *     Ps = 6  -> Selective erase.
   *     Ps = 8  -> User-defined keys.
   *     Ps = 9  -> National replacement character sets.
   *     Ps = 1 5  -> Technical characters.
   *     Ps = 2 2  -> ANSI color, e.g., VT525.
   *     Ps = 2 9  -> ANSI text locator (i.e., DEC Locator mode).
   *
   * @vt: #Y CSI DA1   "Primary Device Attributes"     "CSI c"  "Send primary device attributes."
   *
   *
   * TODO: fix and cleanup response
   */
  sendDeviceAttributesPrimary(params) {
    if (params.params[0] > 0) {
      return true;
    }
    if (this._is("xterm") || this._is("rxvt-unicode") || this._is("screen")) {
      this._coreService.triggerDataEvent("\x1B" /* ESC */ + "[?1;2c");
    } else if (this._is("linux")) {
      this._coreService.triggerDataEvent("\x1B" /* ESC */ + "[?6c");
    }
    return true;
  }
  /**
   * CSI > Ps c
   *   Send Device Attributes (Secondary DA).
   *     Ps = 0  or omitted -> request the terminal's identification
   *     code.  The response depends on the decTerminalID resource set-
   *     ting.  It should apply only to VT220 and up, but xterm extends
   *     this to VT100.
   *     -> CSI  > Pp ; Pv ; Pc c
   *   where Pp denotes the terminal type
   *     Pp = 0  -> ``VT100''.
   *     Pp = 1  -> ``VT220''.
   *   and Pv is the firmware version (for xterm, this was originally
   *   the XFree86 patch number, starting with 95).  In a DEC termi-
   *   nal, Pc indicates the ROM cartridge registration number and is
   *   always zero.
   * More information:
   *   xterm/charproc.c - line 2012, for more information.
   *   vim responds with ^[[?0c or ^[[?1c after the terminal's response (?)
   *
   * @vt: #Y CSI DA2   "Secondary Device Attributes"   "CSI > c" "Send primary device attributes."
   *
   *
   * TODO: fix and cleanup response
   */
  sendDeviceAttributesSecondary(params) {
    if (params.params[0] > 0) {
      return true;
    }
    if (this._is("xterm")) {
      this._coreService.triggerDataEvent("\x1B" /* ESC */ + "[>0;276;0c");
    } else if (this._is("rxvt-unicode")) {
      this._coreService.triggerDataEvent("\x1B" /* ESC */ + "[>85;95;0c");
    } else if (this._is("linux")) {
      this._coreService.triggerDataEvent(params.params[0] + "c");
    } else if (this._is("screen")) {
      this._coreService.triggerDataEvent("\x1B" /* ESC */ + "[>83;40003;0c");
    }
    return true;
  }
  /**
   * CSI > Ps q
   *   Ps = 0  => Report xterm name and version (XTVERSION).
   *
   * The response is a DCS sequence identifying the version: DCS > | text ST
   *
   * @vt: #Y CSI XTVERSION "Report Xterm Version" "CSI > q" "Report the terminal name and version."
   */
  sendXtVersion(params) {
    if (params.params[0] > 0) {
      return true;
    }
    this._coreService.triggerDataEvent(`${"\x1B" /* ESC */}P>|xterm.js(${XTERM_VERSION})${"\x1B" /* ESC */}\\`);
    return true;
  }
  /**
   * Evaluate if the current terminal is the given argument.
   * @param term The terminal name to evaluate
   */
  _is(term) {
    return (this._optionsService.rawOptions.termName + "").startsWith(term);
  }
  /**
   * CSI Pm h  Set Mode (SM).
   *     Ps = 2  -> Keyboard Action Mode (AM).
   *     Ps = 4  -> Insert Mode (IRM).
   *     Ps = 1 2  -> Send/receive (SRM).
   *     Ps = 2 0  -> Automatic Newline (LNM).
   *
   * @vt: #P[Only IRM is supported.]    CSI SM    "Set Mode"  "CSI Pm h"  "Set various terminal modes."
   * Supported param values by SM:
   *
   * | Param | Action                                 | Support |
   * | ----- | -------------------------------------- | ------- |
   * | 2     | Keyboard Action Mode (KAM). Always on. | #N      |
   * | 4     | Insert Mode (IRM).                     | #Y      |
   * | 12    | Send/receive (SRM). Always off.        | #N      |
   * | 20    | Automatic Newline (LNM).               | #Y      |
   */
  setMode(params) {
    for (let i = 0; i < params.length; i++) {
      switch (params.params[i]) {
        case 4:
          this._coreService.modes.insertMode = true;
          break;
        case 20:
          this._optionsService.options.convertEol = true;
          break;
      }
    }
    return true;
  }
  /**
   * CSI ? Pm h
   *   DEC Private Mode Set (DECSET).
   *     Ps = 1  -> Application Cursor Keys (DECCKM).
   *     Ps = 2  -> Designate USASCII for character sets G0-G3
   *     (DECANM), and set VT100 mode.
   *     Ps = 3  -> 132 Column Mode (DECCOLM).
   *     Ps = 4  -> Smooth (Slow) Scroll (DECSCLM).
   *     Ps = 5  -> Reverse Video (DECSCNM).
   *     Ps = 6  -> Origin Mode (DECOM).
   *     Ps = 7  -> Wraparound Mode (DECAWM).
   *     Ps = 8  -> Auto-repeat Keys (DECARM).
   *     Ps = 9  -> Send Mouse X & Y on button press.  See the sec-
   *     tion Mouse Tracking.
   *     Ps = 1 0  -> Show toolbar (rxvt).
   *     Ps = 1 2  -> Start Blinking Cursor (att610).
   *     Ps = 1 8  -> Print form feed (DECPFF).
   *     Ps = 1 9  -> Set print extent to full screen (DECPEX).
   *     Ps = 2 5  -> Show Cursor (DECTCEM).
   *     Ps = 3 0  -> Show scrollbar (rxvt).
   *     Ps = 3 5  -> Enable font-shifting functions (rxvt).
   *     Ps = 3 8  -> Enter Tektronix Mode (DECTEK).
   *     Ps = 4 0  -> Allow 80 -> 132 Mode.
   *     Ps = 4 1  -> more(1) fix (see curses resource).
   *     Ps = 4 2  -> Enable Nation Replacement Character sets (DECN-
   *     RCM).
   *     Ps = 4 4  -> Turn On Margin Bell.
   *     Ps = 4 5  -> Reverse-wraparound Mode.
   *     Ps = 4 6  -> Start Logging.  This is normally disabled by a
   *     compile-time option.
   *     Ps = 4 7  -> Use Alternate Screen Buffer.  (This may be dis-
   *     abled by the titeInhibit resource).
   *     Ps = 6 6  -> Application keypad (DECNKM).
   *     Ps = 6 7  -> Backarrow key sends backspace (DECBKM).
   *     Ps = 1 0 0 0  -> Send Mouse X & Y on button press and
   *     release.  See the section Mouse Tracking.
   *     Ps = 1 0 0 1  -> Use Hilite Mouse Tracking.
   *     Ps = 1 0 0 2  -> Use Cell Motion Mouse Tracking.
   *     Ps = 1 0 0 3  -> Use All Motion Mouse Tracking.
   *     Ps = 1 0 0 4  -> Send FocusIn/FocusOut events.
   *     Ps = 1 0 0 5  -> Enable Extended Mouse Mode.
   *     Ps = 1 0 1 0  -> Scroll to bottom on tty output (rxvt).
   *     Ps = 1 0 1 1  -> Scroll to bottom on key press (rxvt).
   *     Ps = 1 0 3 4  -> Interpret "meta" key, sets eighth bit.
   *     (enables the eightBitInput resource).
   *     Ps = 1 0 3 5  -> Enable special modifiers for Alt and Num-
   *     Lock keys.  (This enables the numLock resource).
   *     Ps = 1 0 3 6  -> Send ESC   when Meta modifies a key.  (This
   *     enables the metaSendsEscape resource).
   *     Ps = 1 0 3 7  -> Send DEL from the editing-keypad Delete
   *     key.
   *     Ps = 1 0 3 9  -> Send ESC  when Alt modifies a key.  (This
   *     enables the altSendsEscape resource).
   *     Ps = 1 0 4 0  -> Keep selection even if not highlighted.
   *     (This enables the keepSelection resource).
   *     Ps = 1 0 4 1  -> Use the CLIPBOARD selection.  (This enables
   *     the selectToClipboard resource).
   *     Ps = 1 0 4 2  -> Enable Urgency window manager hint when
   *     Control-G is received.  (This enables the bellIsUrgent
   *     resource).
   *     Ps = 1 0 4 3  -> Enable raising of the window when Control-G
   *     is received.  (enables the popOnBell resource).
   *     Ps = 1 0 4 7  -> Use Alternate Screen Buffer.  (This may be
   *     disabled by the titeInhibit resource).
   *     Ps = 1 0 4 8  -> Save cursor as in DECSC.  (This may be dis-
   *     abled by the titeInhibit resource).
   *     Ps = 1 0 4 9  -> Save cursor as in DECSC and use Alternate
   *     Screen Buffer, clearing it first.  (This may be disabled by
   *     the titeInhibit resource).  This combines the effects of the 1
   *     0 4 7  and 1 0 4 8  modes.  Use this with terminfo-based
   *     applications rather than the 4 7  mode.
   *     Ps = 1 0 5 0  -> Set terminfo/termcap function-key mode.
   *     Ps = 1 0 5 1  -> Set Sun function-key mode.
   *     Ps = 1 0 5 2  -> Set HP function-key mode.
   *     Ps = 1 0 5 3  -> Set SCO function-key mode.
   *     Ps = 1 0 6 0  -> Set legacy keyboard emulation (X11R6).
   *     Ps = 1 0 6 1  -> Set VT220 keyboard emulation.
   *     Ps = 2 0 0 4  -> Set bracketed paste mode.
   * Modes:
   *   http: *vt100.net/docs/vt220-rm/chapter4.html
   *
   * @vt: #P[See below for supported modes.]    CSI DECSET  "DEC Private Set Mode" "CSI ? Pm h"  "Set various terminal attributes."
   * Supported param values by DECSET:
   *
   * | param | Action                                                  | Support |
   * | ----- | ------------------------------------------------------- | --------|
   * | 1     | Application Cursor Keys (DECCKM).                       | #Y      |
   * | 2     | Designate US-ASCII for character sets G0-G3 (DECANM).   | #Y      |
   * | 3     | 132 Column Mode (DECCOLM).                              | #Y      |
   * | 6     | Origin Mode (DECOM).                                    | #Y      |
   * | 7     | Auto-wrap Mode (DECAWM).                                | #Y      |
   * | 8     | Auto-repeat Keys (DECARM). Always on.                   | #N      |
   * | 9     | X10 xterm mouse protocol.                               | #Y      |
   * | 12    | Start Blinking Cursor.                                  | #P[Requires the allowSetCursorBlink quirk option enabled.] |
   * | 25    | Show Cursor (DECTCEM).                                  | #Y      |
   * | 45    | Reverse wrap-around.                                    | #Y      |
   * | 47    | Use Alternate Screen Buffer.                            | #Y      |
   * | 66    | Application keypad (DECNKM).                            | #Y      |
   * | 1000  | X11 xterm mouse protocol.                               | #Y      |
   * | 1002  | Use Cell Motion Mouse Tracking.                         | #Y      |
   * | 1003  | Use All Motion Mouse Tracking.                          | #Y      |
   * | 1004  | Send FocusIn/FocusOut events                            | #Y      |
   * | 1005  | Enable UTF-8 Mouse Mode.                                | #N      |
   * | 1006  | Enable SGR Mouse Mode.                                  | #Y      |
   * | 1015  | Enable urxvt Mouse Mode.                                | #N      |
   * | 1016  | Enable SGR-Pixels Mouse Mode.                           | #Y      |
   * | 1047  | Use Alternate Screen Buffer.                            | #Y      |
   * | 1048  | Save cursor as in DECSC.                                | #Y      |
   * | 1049  | Save cursor and switch to alternate buffer clearing it. | #P[Does not clear the alternate buffer.] |
   * | 2004  | Set bracketed paste mode.                               | #Y      |
   *
   *
   * FIXME: implement DECSCNM, 1049 should clear altbuffer
   */
  setModePrivate(params) {
    for (let i = 0; i < params.length; i++) {
      switch (params.params[i]) {
        case 1:
          this._coreService.decPrivateModes.applicationCursorKeys = true;
          break;
        case 2:
          this._charsetService.setgCharset(0, DEFAULT_CHARSET);
          this._charsetService.setgCharset(1, DEFAULT_CHARSET);
          this._charsetService.setgCharset(2, DEFAULT_CHARSET);
          this._charsetService.setgCharset(3, DEFAULT_CHARSET);
          break;
        case 3:
          if (this._optionsService.rawOptions.windowOptions.setWinLines) {
            this._bufferService.resize(132, this._bufferService.rows);
            this._onRequestReset.fire();
          }
          break;
        case 6:
          this._coreService.decPrivateModes.origin = true;
          this._setCursor(0, 0);
          break;
        case 7:
          this._coreService.decPrivateModes.wraparound = true;
          break;
        case 12:
          if (this._optionsService.rawOptions.quirks?.allowSetCursorBlink) {
            this._optionsService.options.cursorBlink = true;
          }
          break;
        case 45:
          this._coreService.decPrivateModes.reverseWraparound = true;
          break;
        case 66:
          this._logService.debug("Serial port requested application keypad.");
          this._coreService.decPrivateModes.applicationKeypad = true;
          this._onRequestSyncScrollBar.fire();
          break;
        case 9:
          this._mouseStateService.activeProtocol = "X10";
          break;
        case 1e3:
          this._mouseStateService.activeProtocol = "VT200";
          break;
        case 1002:
          this._mouseStateService.activeProtocol = "DRAG";
          break;
        case 1003:
          this._mouseStateService.activeProtocol = "ANY";
          break;
        case 1004:
          this._coreService.decPrivateModes.sendFocus = true;
          this._onRequestSendFocus.fire();
          break;
        case 1005:
          this._logService.debug("DECSET 1005 not supported (see #2507)");
          break;
        case 1006:
          this._mouseStateService.activeEncoding = "SGR";
          break;
        case 1015:
          this._logService.debug("DECSET 1015 not supported (see #2507)");
          break;
        case 1016:
          this._mouseStateService.activeEncoding = "SGR_PIXELS";
          break;
        case 25:
          this._coreService.isCursorHidden = false;
          break;
        case 1048:
          this.saveCursor();
          break;
        case 1049:
          this.saveCursor();
        // FALL-THROUGH
        case 47:
        // alt screen buffer
        case 1047:
          if (this._optionsService.rawOptions.vtExtensions?.kittyKeyboard) {
            const state = this._coreService.kittyKeyboard;
            state.mainFlags = state.flags;
            state.flags = state.altFlags;
          }
          this._bufferService.buffers.activateAltBuffer(this._eraseAttrData());
          this._coreService.isCursorInitialized = true;
          this._onRequestRefreshRows.fire(void 0);
          this._onRequestSyncScrollBar.fire();
          break;
        case 2004:
          this._coreService.decPrivateModes.bracketedPasteMode = true;
          break;
        case 2026:
          this._coreService.decPrivateModes.synchronizedOutput = true;
          break;
        case 2031:
          if (this._optionsService.rawOptions.vtExtensions?.colorSchemeQuery ?? true) {
            this._coreService.decPrivateModes.colorSchemeUpdates = true;
          }
          break;
        case 9001:
          if (this._optionsService.rawOptions.vtExtensions?.win32InputMode) {
            this._coreService.decPrivateModes.win32InputMode = true;
          }
          break;
      }
    }
    return true;
  }
  /**
   * CSI Pm l  Reset Mode (RM).
   *     Ps = 2  -> Keyboard Action Mode (AM).
   *     Ps = 4  -> Replace Mode (IRM).
   *     Ps = 1 2  -> Send/receive (SRM).
   *     Ps = 2 0  -> Normal Linefeed (LNM).
   *
   * @vt: #P[Only IRM is supported.]    CSI RM    "Reset Mode"  "CSI Pm l"  "Set various terminal attributes."
   * Supported param values by RM:
   *
   * | Param | Action                                 | Support |
   * | ----- | -------------------------------------- | ------- |
   * | 2     | Keyboard Action Mode (KAM). Always on. | #N      |
   * | 4     | Replace Mode (IRM). (default)          | #Y      |
   * | 12    | Send/receive (SRM). Always off.        | #N      |
   * | 20    | Normal Linefeed (LNM).                 | #Y      |
   *
   *
   * FIXME: why is LNM commented out?
   */
  resetMode(params) {
    for (let i = 0; i < params.length; i++) {
      switch (params.params[i]) {
        case 4:
          this._coreService.modes.insertMode = false;
          break;
        case 20:
          this._optionsService.options.convertEol = false;
          break;
      }
    }
    return true;
  }
  /**
   * CSI ? Pm l
   *   DEC Private Mode Reset (DECRST).
   *     Ps = 1  -> Normal Cursor Keys (DECCKM).
   *     Ps = 2  -> Designate VT52 mode (DECANM).
   *     Ps = 3  -> 80 Column Mode (DECCOLM).
   *     Ps = 4  -> Jump (Fast) Scroll (DECSCLM).
   *     Ps = 5  -> Normal Video (DECSCNM).
   *     Ps = 6  -> Normal Cursor Mode (DECOM).
   *     Ps = 7  -> No Wraparound Mode (DECAWM).
   *     Ps = 8  -> No Auto-repeat Keys (DECARM).
   *     Ps = 9  -> Don't send Mouse X & Y on button press.
   *     Ps = 1 0  -> Hide toolbar (rxvt).
   *     Ps = 1 2  -> Stop Blinking Cursor (att610).
   *     Ps = 1 8  -> Don't print form feed (DECPFF).
   *     Ps = 1 9  -> Limit print to scrolling region (DECPEX).
   *     Ps = 2 5  -> Hide Cursor (DECTCEM).
   *     Ps = 3 0  -> Don't show scrollbar (rxvt).
   *     Ps = 3 5  -> Disable font-shifting functions (rxvt).
   *     Ps = 4 0  -> Disallow 80 -> 132 Mode.
   *     Ps = 4 1  -> No more(1) fix (see curses resource).
   *     Ps = 4 2  -> Disable Nation Replacement Character sets (DEC-
   *     NRCM).
   *     Ps = 4 4  -> Turn Off Margin Bell.
   *     Ps = 4 5  -> No Reverse-wraparound Mode.
   *     Ps = 4 6  -> Stop Logging.  (This is normally disabled by a
   *     compile-time option).
   *     Ps = 4 7  -> Use Normal Screen Buffer.
   *     Ps = 6 6  -> Numeric keypad (DECNKM).
   *     Ps = 6 7  -> Backarrow key sends delete (DECBKM).
   *     Ps = 1 0 0 0  -> Don't send Mouse X & Y on button press and
   *     release.  See the section Mouse Tracking.
   *     Ps = 1 0 0 1  -> Don't use Hilite Mouse Tracking.
   *     Ps = 1 0 0 2  -> Don't use Cell Motion Mouse Tracking.
   *     Ps = 1 0 0 3  -> Don't use All Motion Mouse Tracking.
   *     Ps = 1 0 0 4  -> Don't send FocusIn/FocusOut events.
   *     Ps = 1 0 0 5  -> Disable Extended Mouse Mode.
   *     Ps = 1 0 1 0  -> Don't scroll to bottom on tty output
   *     (rxvt).
   *     Ps = 1 0 1 1  -> Don't scroll to bottom on key press (rxvt).
   *     Ps = 1 0 3 4  -> Don't interpret "meta" key.  (This disables
   *     the eightBitInput resource).
   *     Ps = 1 0 3 5  -> Disable special modifiers for Alt and Num-
   *     Lock keys.  (This disables the numLock resource).
   *     Ps = 1 0 3 6  -> Don't send ESC  when Meta modifies a key.
   *     (This disables the metaSendsEscape resource).
   *     Ps = 1 0 3 7  -> Send VT220 Remove from the editing-keypad
   *     Delete key.
   *     Ps = 1 0 3 9  -> Don't send ESC  when Alt modifies a key.
   *     (This disables the altSendsEscape resource).
   *     Ps = 1 0 4 0  -> Do not keep selection when not highlighted.
   *     (This disables the keepSelection resource).
   *     Ps = 1 0 4 1  -> Use the PRIMARY selection.  (This disables
   *     the selectToClipboard resource).
   *     Ps = 1 0 4 2  -> Disable Urgency window manager hint when
   *     Control-G is received.  (This disables the bellIsUrgent
   *     resource).
   *     Ps = 1 0 4 3  -> Disable raising of the window when Control-
   *     G is received.  (This disables the popOnBell resource).
   *     Ps = 1 0 4 7  -> Use Normal Screen Buffer, clearing screen
   *     first if in the Alternate Screen.  (This may be disabled by
   *     the titeInhibit resource).
   *     Ps = 1 0 4 8  -> Restore cursor as in DECRC.  (This may be
   *     disabled by the titeInhibit resource).
   *     Ps = 1 0 4 9  -> Use Normal Screen Buffer and restore cursor
   *     as in DECRC.  (This may be disabled by the titeInhibit
   *     resource).  This combines the effects of the 1 0 4 7  and 1 0
   *     4 8  modes.  Use this with terminfo-based applications rather
   *     than the 4 7  mode.
   *     Ps = 1 0 5 0  -> Reset terminfo/termcap function-key mode.
   *     Ps = 1 0 5 1  -> Reset Sun function-key mode.
   *     Ps = 1 0 5 2  -> Reset HP function-key mode.
   *     Ps = 1 0 5 3  -> Reset SCO function-key mode.
   *     Ps = 1 0 6 0  -> Reset legacy keyboard emulation (X11R6).
   *     Ps = 1 0 6 1  -> Reset keyboard emulation to Sun/PC style.
   *     Ps = 2 0 0 4  -> Reset bracketed paste mode.
   *
   * @vt: #P[See below for supported modes.]    CSI DECRST  "DEC Private Reset Mode" "CSI ? Pm l"  "Reset various terminal attributes."
   * Supported param values by DECRST:
   *
   * | param | Action                                                  | Support |
   * | ----- | ------------------------------------------------------- | ------- |
   * | 1     | Normal Cursor Keys (DECCKM).                            | #Y      |
   * | 2     | Designate VT52 mode (DECANM).                           | #N      |
   * | 3     | 80 Column Mode (DECCOLM).                               | #B[Switches to old column width instead of 80.] |
   * | 6     | Normal Cursor Mode (DECOM).                             | #Y      |
   * | 7     | No Wraparound Mode (DECAWM).                            | #Y      |
   * | 8     | No Auto-repeat Keys (DECARM).                           | #N      |
   * | 9     | Don't send Mouse X & Y on button press.                 | #Y      |
   * | 12    | Stop Blinking Cursor.                                   | #P[Requires the allowSetCursorBlink quirk option enabled.] |
   * | 25    | Hide Cursor (DECTCEM).                                  | #Y      |
   * | 45    | No reverse wrap-around.                                 | #Y      |
   * | 47    | Use Normal Screen Buffer.                               | #Y      |
   * | 66    | Numeric keypad (DECNKM).                                | #Y      |
   * | 1000  | Don't send Mouse reports.                               | #Y      |
   * | 1002  | Don't use Cell Motion Mouse Tracking.                   | #Y      |
   * | 1003  | Don't use All Motion Mouse Tracking.                    | #Y      |
   * | 1004  | Don't send FocusIn/FocusOut events.                     | #Y      |
   * | 1005  | Disable UTF-8 Mouse Mode.                               | #N      |
   * | 1006  | Disable SGR Mouse Mode.                                 | #Y      |
   * | 1015  | Disable urxvt Mouse Mode.                               | #N      |
   * | 1016  | Disable SGR-Pixels Mouse Mode.                          | #Y      |
   * | 1047  | Use Normal Screen Buffer (clearing screen if in alt).   | #Y      |
   * | 1048  | Restore cursor as in DECRC.                             | #Y      |
   * | 1049  | Use Normal Screen Buffer and restore cursor.            | #Y      |
   * | 2004  | Reset bracketed paste mode.                             | #Y      |
   *
   *
   * FIXME: DECCOLM is currently broken (already fixed in window options PR)
   */
  resetModePrivate(params) {
    for (let i = 0; i < params.length; i++) {
      switch (params.params[i]) {
        case 1:
          this._coreService.decPrivateModes.applicationCursorKeys = false;
          break;
        case 3:
          if (this._optionsService.rawOptions.windowOptions.setWinLines) {
            this._bufferService.resize(80, this._bufferService.rows);
            this._onRequestReset.fire();
          }
          break;
        case 6:
          this._coreService.decPrivateModes.origin = false;
          this._setCursor(0, 0);
          break;
        case 7:
          this._coreService.decPrivateModes.wraparound = false;
          break;
        case 12:
          if (this._optionsService.rawOptions.quirks?.allowSetCursorBlink) {
            this._optionsService.options.cursorBlink = false;
          }
          break;
        case 45:
          this._coreService.decPrivateModes.reverseWraparound = false;
          break;
        case 66:
          this._logService.debug("Switching back to normal keypad.");
          this._coreService.decPrivateModes.applicationKeypad = false;
          this._onRequestSyncScrollBar.fire();
          break;
        case 9:
        // X10 Mouse
        case 1e3:
        // vt200 mouse
        case 1002:
        // button event mouse
        case 1003:
          this._mouseStateService.activeProtocol = "NONE";
          break;
        case 1004:
          this._coreService.decPrivateModes.sendFocus = false;
          break;
        case 1005:
          this._logService.debug("DECRST 1005 not supported (see #2507)");
          break;
        case 1006:
          this._mouseStateService.activeEncoding = "DEFAULT";
          break;
        case 1015:
          this._logService.debug("DECRST 1015 not supported (see #2507)");
          break;
        case 1016:
          this._mouseStateService.activeEncoding = "DEFAULT";
          break;
        case 25:
          this._coreService.isCursorHidden = true;
          break;
        case 1048:
          this.restoreCursor();
          break;
        case 1049:
        // alt screen buffer cursor
        // FALL-THROUGH
        case 47:
        // normal screen buffer
        case 1047:
          if (this._optionsService.rawOptions.vtExtensions?.kittyKeyboard) {
            const state = this._coreService.kittyKeyboard;
            state.altFlags = state.flags;
            state.flags = state.mainFlags;
          }
          this._bufferService.buffers.activateNormalBuffer();
          if (params.params[i] === 1049) {
            this.restoreCursor();
          }
          this._coreService.isCursorInitialized = true;
          this._onRequestRefreshRows.fire(void 0);
          this._onRequestSyncScrollBar.fire();
          break;
        case 2004:
          this._coreService.decPrivateModes.bracketedPasteMode = false;
          break;
        case 2026:
          this._coreService.decPrivateModes.synchronizedOutput = false;
          this._onRequestRefreshRows.fire(void 0);
          break;
        case 2031:
          if (this._optionsService.rawOptions.vtExtensions?.colorSchemeQuery ?? true) {
            this._coreService.decPrivateModes.colorSchemeUpdates = false;
          }
          break;
        case 9001:
          if (this._optionsService.rawOptions.vtExtensions?.win32InputMode) {
            this._coreService.decPrivateModes.win32InputMode = false;
          }
          break;
      }
    }
    return true;
  }
  /**
   * CSI Ps $ p Request ANSI Mode (DECRQM).
   *
   * Reports CSI Ps; Pm $ y (DECRPM), where Ps is the mode number as in SM/RM,
   * and Pm is the mode value:
   *    0 - not recognized
   *    1 - set
   *    2 - reset
   *    3 - permanently set
   *    4 - permanently reset
   *
   * @vt: #Y  CSI   DECRQM  "Request Mode"  "CSI Ps $p"  "Request mode state."
   * Returns a report as `CSI Ps; Pm $ y` (DECRPM), where `Ps` is the mode number as in SM/RM
   * or DECSET/DECRST, and `Pm` is the mode value:
   * - 0: not recognized
   * - 1: set
   * - 2: reset
   * - 3: permanently set
   * - 4: permanently reset
   *
   * For modes not understood xterm.js always returns `notRecognized`. In general this means,
   * that a certain operation mode is not implemented and cannot be used.
   *
   * Modes changing the active terminal buffer (47, 1047, 1049) are not subqueried
   * and only report, whether the alternate buffer is set.
   *
   * Mouse encodings and mouse protocols are handled mutual exclusive,
   * thus only one of each of those can be set at a given time.
   *
   * There is a chance, that some mode reports are not fully in line with xterm.js' behavior,
   * e.g. if the default implementation already exposes a certain behavior. If you find
   * discrepancies in the mode reports, please file a bug.
   */
  requestMode(params, ansi) {
    let V;
    ((V2) => {
      V2[V2["NOT_RECOGNIZED"] = 0] = "NOT_RECOGNIZED";
      V2[V2["SET"] = 1] = "SET";
      V2[V2["RESET"] = 2] = "RESET";
      V2[V2["PERMANENTLY_SET"] = 3] = "PERMANENTLY_SET";
      V2[V2["PERMANENTLY_RESET"] = 4] = "PERMANENTLY_RESET";
    })(V || (V = {}));
    const dm = this._coreService.decPrivateModes;
    const { activeProtocol: mouseProtocol, activeEncoding: mouseEncoding } = this._mouseStateService;
    const cs = this._coreService;
    const { buffers, cols } = this._bufferService;
    const { active, alt } = buffers;
    const opts = this._optionsService.rawOptions;
    const f = (m, v) => {
      cs.triggerDataEvent(`${"\x1B" /* ESC */}[${ansi ? "" : "?"}${m};${v}$y`);
      return true;
    };
    const b2v = (value) => value ? 1 /* SET */ : 2 /* RESET */;
    const p = params.params[0];
    if (ansi) {
      if (p === 2) return f(p, 4 /* PERMANENTLY_RESET */);
      if (p === 4) return f(p, b2v(cs.modes.insertMode));
      if (p === 12) return f(p, 3 /* PERMANENTLY_SET */);
      if (p === 20) return f(p, b2v(opts.convertEol));
      return f(p, 0 /* NOT_RECOGNIZED */);
    }
    if (p === 1) return f(p, b2v(dm.applicationCursorKeys));
    if (p === 3) return f(p, opts.windowOptions.setWinLines ? cols === 80 ? 2 /* RESET */ : cols === 132 ? 1 /* SET */ : 0 /* NOT_RECOGNIZED */ : 0 /* NOT_RECOGNIZED */);
    if (p === 6) return f(p, b2v(dm.origin));
    if (p === 7) return f(p, b2v(dm.wraparound));
    if (p === 8) return f(p, 3 /* PERMANENTLY_SET */);
    if (p === 9) return f(p, b2v(mouseProtocol === "X10"));
    if (p === 12) return f(p, b2v(opts.cursorBlink));
    if (p === 25) return f(p, b2v(!cs.isCursorHidden));
    if (p === 45) return f(p, b2v(dm.reverseWraparound));
    if (p === 66) return f(p, b2v(dm.applicationKeypad));
    if (p === 67) return f(p, 4 /* PERMANENTLY_RESET */);
    if (p === 1e3) return f(p, b2v(mouseProtocol === "VT200"));
    if (p === 1002) return f(p, b2v(mouseProtocol === "DRAG"));
    if (p === 1003) return f(p, b2v(mouseProtocol === "ANY"));
    if (p === 1004) return f(p, b2v(dm.sendFocus));
    if (p === 1005) return f(p, 4 /* PERMANENTLY_RESET */);
    if (p === 1006) return f(p, b2v(mouseEncoding === "SGR"));
    if (p === 1015) return f(p, 4 /* PERMANENTLY_RESET */);
    if (p === 1016) return f(p, b2v(mouseEncoding === "SGR_PIXELS"));
    if (p === 1048) return f(p, 1 /* SET */);
    if (p === 47 || p === 1047 || p === 1049) return f(p, b2v(active === alt));
    if (p === 2004) return f(p, b2v(dm.bracketedPasteMode));
    if (p === 2026) return f(p, b2v(dm.synchronizedOutput));
    if (p === 9001) return this._optionsService.rawOptions.vtExtensions?.win32InputMode ? f(p, b2v(dm.win32InputMode)) : f(p, 0 /* NOT_RECOGNIZED */);
    return f(p, 0 /* NOT_RECOGNIZED */);
  }
  /**
   * Helper to write color information packed with color mode.
   */
  _updateAttrColor(color, mode, c1, c2, c3) {
    if (mode === 2) {
      color |= 50331648 /* CM_RGB */;
      color &= ~16777215 /* RGB_MASK */;
      color |= AttributeData.fromColorRGB([c1, c2, c3]);
    } else if (mode === 5) {
      color &= ~(50331648 /* CM_MASK */ | 16777215 /* RGB_MASK */);
      color |= 33554432 /* CM_P256 */ | c1 & 255;
    }
    return color;
  }
  /**
   * Helper to extract and apply color params/subparams.
   * Returns advance for params index.
   */
  _extractColor(params, pos, attr) {
    const accu = [0, 0, -1, 0, 0, 0];
    let cSpace = 0;
    let advance = 0;
    do {
      accu[advance + cSpace] = params.params[pos + advance];
      if (params.hasSubParams(pos + advance)) {
        const subparams = params.getSubParams(pos + advance);
        let i = 0;
        do {
          if (accu[1] === 5) {
            cSpace = 1;
          }
          accu[advance + i + 1 + cSpace] = subparams[i];
        } while (++i < subparams.length && i + advance + 1 + cSpace < accu.length);
        break;
      }
      if (accu[1] === 5 && advance + cSpace >= 2 || accu[1] === 2 && advance + cSpace >= 5) {
        break;
      }
      if (accu[1]) {
        cSpace = 1;
      }
    } while (++advance + pos < params.length && advance + cSpace < accu.length);
    for (let i = 2; i < accu.length; ++i) {
      if (accu[i] === -1) {
        accu[i] = 0;
      }
    }
    switch (accu[0]) {
      case 38:
        attr.fg = this._updateAttrColor(attr.fg, accu[1], accu[3], accu[4], accu[5]);
        break;
      case 48:
        attr.bg = this._updateAttrColor(attr.bg, accu[1], accu[3], accu[4], accu[5]);
        break;
      case 58:
        attr.extended = attr.extended.clone();
        attr.extended.underlineColor = this._updateAttrColor(attr.extended.underlineColor, accu[1], accu[3], accu[4], accu[5]);
    }
    return advance;
  }
  /**
   * SGR 4 subparams:
   *    4:0   -   equal to SGR 24 (turn off all underline)
   *    4:1   -   equal to SGR 4 (single underline)
   *    4:2   -   equal to SGR 21 (double underline)
   *    4:3   -   curly underline
   *    4:4   -   dotted underline
   *    4:5   -   dashed underline
   */
  _processUnderline(style, attr) {
    attr.extended = attr.extended.clone();
    if (!~style || style > 5) {
      style = 1;
    }
    attr.extended.underlineStyle = style;
    attr.fg |= 268435456 /* UNDERLINE */;
    if (style === 0) {
      attr.fg &= ~268435456 /* UNDERLINE */;
    }
    attr.updateExtended();
  }
  _processSGR0(attr) {
    attr.fg = DEFAULT_ATTR_DATA.fg;
    attr.bg = DEFAULT_ATTR_DATA.bg;
    attr.extended = attr.extended.clone();
    attr.extended.underlineStyle = 0 /* NONE */;
    attr.extended.underlineColor &= ~(50331648 /* CM_MASK */ | 16777215 /* RGB_MASK */);
    attr.updateExtended();
  }
  /**
   * CSI Pm m  Character Attributes (SGR).
   *
   * @vt: #P[See below for supported attributes.]    CSI SGR   "Select Graphic Rendition"  "CSI Pm m"  "Set/Reset various text attributes."
   * SGR selects one or more character attributes at the same time. Multiple params (up to 32)
   * are applied in order from left to right. The changed attributes are applied to all new
   * characters received. If you move characters in the viewport by scrolling or any other means,
   * then the attributes move with the characters.
   *
   * Supported param values by SGR:
   *
   * | Param     | Meaning                                                  | Support |
   * | --------- | -------------------------------------------------------- | ------- |
   * | 0         | Normal (default). Resets any other preceding SGR.        | #Y      |
   * | 1         | Bold. (also see `options.drawBoldTextInBrightColors`)    | #Y      |
   * | 2         | Faint, decreased intensity.                              | #Y      |
   * | 3         | Italic.                                                  | #Y      |
   * | 4         | Underlined (see below for style support).                | #Y      |
   * | 5         | Slowly blinking.                                         | #N      |
   * | 6         | Rapidly blinking.                                        | #N      |
   * | 7         | Inverse. Flips foreground and background color.          | #Y      |
   * | 8         | Invisible (hidden).                                      | #Y      |
   * | 9         | Crossed-out characters (strikethrough).                  | #Y      |
   * | 21        | Doubly underlined.                                       | #Y      |
   * | 22        | Normal (neither bold nor faint).                         | #Y      |
   * | 23        | No italic.                                               | #Y      |
   * | 24        | Not underlined.                                          | #Y      |
   * | 25        | Steady (not blinking).                                   | #Y      |
   * | 27        | Positive (not inverse).                                  | #Y      |
   * | 28        | Visible (not hidden).                                    | #Y      |
   * | 29        | Not Crossed-out (strikethrough).                         | #Y      |
   * | 30        | Foreground color: Black.                                 | #Y      |
   * | 31        | Foreground color: Red.                                   | #Y      |
   * | 32        | Foreground color: Green.                                 | #Y      |
   * | 33        | Foreground color: Yellow.                                | #Y      |
   * | 34        | Foreground color: Blue.                                  | #Y      |
   * | 35        | Foreground color: Magenta.                               | #Y      |
   * | 36        | Foreground color: Cyan.                                  | #Y      |
   * | 37        | Foreground color: White.                                 | #Y      |
   * | 38        | Foreground color: Extended color.                        | #P[Support for RGB and indexed colors, see below.] |
   * | 39        | Foreground color: Default (original).                    | #Y      |
   * | 40        | Background color: Black.                                 | #Y      |
   * | 41        | Background color: Red.                                   | #Y      |
   * | 42        | Background color: Green.                                 | #Y      |
   * | 43        | Background color: Yellow.                                | #Y      |
   * | 44        | Background color: Blue.                                  | #Y      |
   * | 45        | Background color: Magenta.                               | #Y      |
   * | 46        | Background color: Cyan.                                  | #Y      |
   * | 47        | Background color: White.                                 | #Y      |
   * | 48        | Background color: Extended color.                        | #P[Support for RGB and indexed colors, see below.] |
   * | 49        | Background color: Default (original).                    | #Y      |
   * | 53        | Overlined.                                               | #Y      |
   * | 55        | Not Overlined.                                           | #Y      |
   * | 58        | Underline color: Extended color.                         | #P[Support for RGB and indexed colors, see below.] |
   * | 221       | Not bold (kitty extension).                              | #Y      |
   * | 222       | Not faint (kitty extension).                             | #Y      |
   * | 90 - 97   | Bright foreground color (analogous to 30 - 37).          | #Y      |
   * | 100 - 107 | Bright background color (analogous to 40 - 47).          | #Y      |
   *
   * Underline supports subparams to denote the style in the form `4 : x`:
   *
   * | x      | Meaning                                                       | Support |
   * | ------ | ------------------------------------------------------------- | ------- |
   * | 0      | No underline. Same as `SGR 24 m`.                             | #Y      |
   * | 1      | Single underline. Same as `SGR 4 m`.                          | #Y      |
   * | 2      | Double underline.                                             | #Y      |
   * | 3      | Curly underline.                                              | #Y      |
   * | 4      | Dotted underline.                                             | #Y      |
   * | 5      | Dashed underline.                                             | #Y      |
   * | other  | Single underline. Same as `SGR 4 m`.                          | #Y      |
   *
   * Extended colors are supported for foreground (Ps=38), background (Ps=48) and underline (Ps=58)
   * as follows:
   *
   * | Ps + 1 | Meaning                                                       | Support |
   * | ------ | ------------------------------------------------------------- | ------- |
   * | 0      | Implementation defined.                                       | #N      |
   * | 1      | Transparent.                                                  | #N      |
   * | 2      | RGB color as `Ps ; 2 ; R ; G ; B` or `Ps : 2 : : R : G : B`.  | #Y      |
   * | 3      | CMY color.                                                    | #N      |
   * | 4      | CMYK color.                                                   | #N      |
   * | 5      | Indexed (256 colors) as `Ps ; 5 ; INDEX` or `Ps : 5 : INDEX`. | #Y      |
   */
  charAttributes(params) {
    if (params.length === 1 && params.params[0] === 0) {
      this._processSGR0(this._curAttrData);
      return true;
    }
    const l = params.length;
    let p;
    const attr = this._curAttrData;
    for (let i = 0; i < l; i++) {
      p = params.params[i];
      if (p >= 30 && p <= 37) {
        attr.fg &= ~(50331648 /* CM_MASK */ | 16777215 /* RGB_MASK */);
        attr.fg |= 16777216 /* CM_P16 */ | p - 30;
      } else if (p >= 40 && p <= 47) {
        attr.bg &= ~(50331648 /* CM_MASK */ | 16777215 /* RGB_MASK */);
        attr.bg |= 16777216 /* CM_P16 */ | p - 40;
      } else if (p >= 90 && p <= 97) {
        attr.fg &= ~(50331648 /* CM_MASK */ | 16777215 /* RGB_MASK */);
        attr.fg |= 16777216 /* CM_P16 */ | p - 90 | 8;
      } else if (p >= 100 && p <= 107) {
        attr.bg &= ~(50331648 /* CM_MASK */ | 16777215 /* RGB_MASK */);
        attr.bg |= 16777216 /* CM_P16 */ | p - 100 | 8;
      } else if (p === 0) {
        this._processSGR0(attr);
      } else if (p === 1) {
        attr.fg |= 134217728 /* BOLD */;
      } else if (p === 3) {
        attr.bg |= 67108864 /* ITALIC */;
      } else if (p === 4) {
        attr.fg |= 268435456 /* UNDERLINE */;
        this._processUnderline(params.hasSubParams(i) ? params.getSubParams(i)[0] : 1 /* SINGLE */, attr);
      } else if (p === 5) {
        attr.fg |= 536870912 /* BLINK */;
      } else if (p === 7) {
        attr.fg |= 67108864 /* INVERSE */;
      } else if (p === 8) {
        attr.fg |= 1073741824 /* INVISIBLE */;
      } else if (p === 9) {
        attr.fg |= 2147483648 /* STRIKETHROUGH */;
      } else if (p === 2) {
        attr.bg |= 134217728 /* DIM */;
      } else if (p === 21) {
        this._processUnderline(2 /* DOUBLE */, attr);
      } else if (p === 22) {
        attr.fg &= ~134217728 /* BOLD */;
        attr.bg &= ~134217728 /* DIM */;
      } else if (p === 23) {
        attr.bg &= ~67108864 /* ITALIC */;
      } else if (p === 24) {
        attr.fg &= ~268435456 /* UNDERLINE */;
        this._processUnderline(0 /* NONE */, attr);
      } else if (p === 25) {
        attr.fg &= ~536870912 /* BLINK */;
      } else if (p === 27) {
        attr.fg &= ~67108864 /* INVERSE */;
      } else if (p === 28) {
        attr.fg &= ~1073741824 /* INVISIBLE */;
      } else if (p === 29) {
        attr.fg &= ~2147483648 /* STRIKETHROUGH */;
      } else if (p === 39) {
        attr.fg &= ~(50331648 /* CM_MASK */ | 16777215 /* RGB_MASK */);
        attr.fg |= DEFAULT_ATTR_DATA.fg & 16777215 /* RGB_MASK */;
      } else if (p === 49) {
        attr.bg &= ~(50331648 /* CM_MASK */ | 16777215 /* RGB_MASK */);
        attr.bg |= DEFAULT_ATTR_DATA.bg & 16777215 /* RGB_MASK */;
      } else if (p === 38 || p === 48 || p === 58) {
        i += this._extractColor(params, i, attr);
      } else if (p === 53) {
        attr.bg |= 1073741824 /* OVERLINE */;
      } else if (p === 55) {
        attr.bg &= ~1073741824 /* OVERLINE */;
      } else if (p === 221 && (this._optionsService.rawOptions.vtExtensions?.kittySgrBoldFaintControl ?? true)) {
        attr.fg &= ~134217728 /* BOLD */;
      } else if (p === 222 && (this._optionsService.rawOptions.vtExtensions?.kittySgrBoldFaintControl ?? true)) {
        attr.bg &= ~134217728 /* DIM */;
      } else if (p === 59) {
        attr.extended = attr.extended.clone();
        attr.extended.underlineColor = -1;
        attr.updateExtended();
      } else {
        this._logService.debug("Unknown SGR attribute: %d.", p);
      }
    }
    return true;
  }
  /**
   * CSI Ps n  Device Status Report (DSR).
   *     Ps = 5  -> Status Report.  Result (``OK'') is
   *   CSI 0 n
   *     Ps = 6  -> Report Cursor Position (CPR) [row;column].
   *   Result is
   *   CSI r ; c R
   * CSI ? Ps n
   *   Device Status Report (DSR, DEC-specific).
   *     Ps = 6  -> Report Cursor Position (CPR) [row;column] as CSI
   *     ? r ; c R (assumes page is zero).
   *     Ps = 1 5  -> Report Printer status as CSI ? 1 0  n  (ready).
   *     or CSI ? 1 1  n  (not ready).
   *     Ps = 2 5  -> Report UDK status as CSI ? 2 0  n  (unlocked)
   *     or CSI ? 2 1  n  (locked).
   *     Ps = 2 6  -> Report Keyboard status as
   *   CSI ? 2 7  ;  1  ;  0  ;  0  n  (North American).
   *   The last two parameters apply to VT400 & up, and denote key-
   *   board ready and LK01 respectively.
   *     Ps = 5 3  -> Report Locator status as
   *   CSI ? 5 3  n  Locator available, if compiled-in, or
   *   CSI ? 5 0  n  No Locator, if not.
   *
   * @vt: #Y CSI DSR   "Device Status Report"  "CSI Ps n"  "Request cursor position (CPR) with `Ps` = 6."
   */
  deviceStatus(params) {
    switch (params.params[0]) {
      case 5:
        this._coreService.triggerDataEvent(`${"\x1B" /* ESC */}[0n`);
        break;
      case 6:
        const y = this._activeBuffer.y + 1;
        const x = this._activeBuffer.x + 1;
        this._coreService.triggerDataEvent(`${"\x1B" /* ESC */}[${y};${x}R`);
        break;
    }
    return true;
  }
  // @vt: #P[Only CPR is supported.]  CSI DECDSR  "DEC Device Status Report"  "CSI ? Ps n"  "Only CPR is supported (same as DSR)."
  deviceStatusPrivate(params) {
    switch (params.params[0]) {
      case 6:
        const y = this._activeBuffer.y + 1;
        const x = this._activeBuffer.x + 1;
        this._coreService.triggerDataEvent(`${"\x1B" /* ESC */}[?${y};${x}R`);
        break;
      case 15:
        break;
      case 25:
        break;
      case 26:
        break;
      case 53:
        break;
      case 996:
        if (this._optionsService.rawOptions.vtExtensions?.colorSchemeQuery ?? true) {
          this._onRequestColorSchemeQuery.fire();
        }
        break;
    }
    return true;
  }
  /**
   * CSI ! p   Soft terminal reset (DECSTR).
   * http://vt100.net/docs/vt220-rm/table4-10.html
   *
   * @vt: #Y CSI DECSTR  "Soft Terminal Reset"   "CSI ! p"   "Reset several terminal attributes to initial state."
   * There are two terminal reset sequences - RIS and DECSTR. While RIS performs almost a full
   * terminal bootstrap, DECSTR only resets certain attributes. For most needs DECSTR should be
   * sufficient.
   *
   * The following terminal attributes are reset to default values:
   * - IRM is reset (dafault = false)
   * - scroll margins are reset (default = viewport size)
   * - erase attributes are reset to default
   * - charsets are reset
   * - DECSC data is reset to initial values
   * - DECOM is reset to absolute mode
   *
   *
   * FIXME: there are several more attributes missing (see VT520 manual)
   */
  softReset(params) {
    this._coreService.isCursorHidden = false;
    this._onRequestSyncScrollBar.fire();
    this._activeBuffer.scrollTop = 0;
    this._activeBuffer.scrollBottom = this._bufferService.rows - 1;
    this._curAttrData = DEFAULT_ATTR_DATA.clone();
    this._coreService.reset();
    this._charsetService.reset();
    this._activeBuffer.savedX = 0;
    this._activeBuffer.savedY = this._activeBuffer.ybase;
    this._activeBuffer.savedCurAttrData.fg = this._curAttrData.fg;
    this._activeBuffer.savedCurAttrData.bg = this._curAttrData.bg;
    this._activeBuffer.savedCharset = this._charsetService.charset;
    this._coreService.decPrivateModes.origin = false;
    return true;
  }
  /**
   * CSI Ps SP q  Set cursor style (DECSCUSR, VT520).
   *   Ps = 0  -> reset to option.
   *   Ps = 1  -> blinking block (default).
   *   Ps = 2  -> steady block.
   *   Ps = 3  -> blinking underline.
   *   Ps = 4  -> steady underline.
   *   Ps = 5  -> blinking bar (xterm).
   *   Ps = 6  -> steady bar (xterm).
   *
   * @vt: #Y CSI DECSCUSR  "Set Cursor Style"  "CSI Ps SP q"   "Set cursor style."
   * Supported cursor styles:
   *  - 0: reset to option
   *  - empty, 1: blinking block
   *  - 2: steady block
   *  - 3: blinking underline
   *  - 4: steady underline
   *  - 5: blinking bar
   *  - 6: steady bar
   */
  setCursorStyle(params) {
    const param = params.length === 0 ? 1 : params.params[0];
    if (param === 0) {
      this._coreService.decPrivateModes.cursorStyle = void 0;
      this._coreService.decPrivateModes.cursorBlink = void 0;
    } else {
      switch (param) {
        case 1:
        case 2:
          this._coreService.decPrivateModes.cursorStyle = "block";
          break;
        case 3:
        case 4:
          this._coreService.decPrivateModes.cursorStyle = "underline";
          break;
        case 5:
        case 6:
          this._coreService.decPrivateModes.cursorStyle = "bar";
          break;
      }
      const isBlinking = param % 2 === 1;
      this._coreService.decPrivateModes.cursorBlink = isBlinking;
    }
    return true;
  }
  /**
   * CSI Ps ; Ps r
   *   Set Scrolling Region [top;bottom] (default = full size of win-
   *   dow) (DECSTBM).
   *
   * @vt: #Y CSI DECSTBM "Set Top and Bottom Margin" "CSI Ps ; Ps r" "Set top and bottom margins of the viewport [top;bottom] (default = viewport size)."
   */
  setScrollRegion(params) {
    const top = params.params[0] || 1;
    let bottom;
    if (params.length < 2 || (bottom = params.params[1]) > this._bufferService.rows || bottom === 0) {
      bottom = this._bufferService.rows;
    }
    if (bottom > top) {
      this._activeBuffer.scrollTop = top - 1;
      this._activeBuffer.scrollBottom = bottom - 1;
      this._setCursor(0, 0);
    }
    return true;
  }
  /**
   * CSI Ps ; Ps ; Ps t - Various window manipulations and reports (xterm)
   *
   * Note: Only those listed below are supported. All others are left to integrators and
   * need special treatment based on the embedding environment.
   *
   *    Ps = 1 4                                                          supported
   *      Report xterm text area size in pixels.
   *      Result is CSI 4 ; height ; width t
   *    Ps = 14 ; 2                                                       not implemented
   *    Ps = 16                                                           supported
   *      Report xterm character cell size in pixels.
   *      Result is CSI 6 ; height ; width t
   *    Ps = 18                                                           supported
   *      Report the size of the text area in characters.
   *      Result is CSI 8 ; height ; width t
   *    Ps = 20                                                           supported
   *      Report xterm window's icon label.
   *      Result is OSC L label ST
   *    Ps = 21                                                           supported
   *      Report xterm window's title.
   *      Result is OSC l label ST
   *    Ps = 22 ; 0  -> Save xterm icon and window title on stack.        supported
   *    Ps = 22 ; 1  -> Save xterm icon title on stack.                   supported
   *    Ps = 22 ; 2  -> Save xterm window title on stack.                 supported
   *    Ps = 23 ; 0  -> Restore xterm icon and window title from stack.   supported
   *    Ps = 23 ; 1  -> Restore xterm icon title from stack.              supported
   *    Ps = 23 ; 2  -> Restore xterm window title from stack.            supported
   *    Ps >= 24                                                          not implemented
   */
  windowOptions(params) {
    if (!paramToWindowOption(params.params[0], this._optionsService.rawOptions.windowOptions)) {
      return true;
    }
    const second = params.length > 1 ? params.params[1] : 0;
    switch (params.params[0]) {
      case 14:
        if (second !== 2) {
          this._onRequestWindowsOptionsReport.fire(0 /* GET_WIN_SIZE_PIXELS */);
        }
        break;
      case 16:
        this._onRequestWindowsOptionsReport.fire(1 /* GET_CELL_SIZE_PIXELS */);
        break;
      case 18:
        if (this._bufferService) {
          this._coreService.triggerDataEvent(`${"\x1B" /* ESC */}[8;${this._bufferService.rows};${this._bufferService.cols}t`);
        }
        break;
      case 22:
        if (second === 0 || second === 2) {
          this._windowTitleStack.push(this._windowTitle);
          if (this._windowTitleStack.length > 10 /* STACK_LIMIT */) {
            this._windowTitleStack.shift();
          }
        }
        if (second === 0 || second === 1) {
          this._iconNameStack.push(this._iconName);
          if (this._iconNameStack.length > 10 /* STACK_LIMIT */) {
            this._iconNameStack.shift();
          }
        }
        break;
      case 23:
        if (second === 0 || second === 2) {
          if (this._windowTitleStack.length) {
            this.setTitle(this._windowTitleStack.pop());
          }
        }
        if (second === 0 || second === 1) {
          if (this._iconNameStack.length) {
            this.setIconName(this._iconNameStack.pop());
          }
        }
        break;
    }
    return true;
  }
  /**
   * CSI s
   * ESC 7
   *   Save cursor (ANSI.SYS).
   *
   * @vt: #P[TODO...]  CSI SCOSC   "Save Cursor"   "CSI s"   "Save cursor position, charmap and text attributes."
   * @vt: #Y ESC  SC   "Save Cursor"   "ESC 7"   "Save cursor position, charmap and text attributes."
   */
  saveCursor(params) {
    this._activeBuffer.savedX = this._activeBuffer.x;
    this._activeBuffer.savedY = this._activeBuffer.ybase + this._activeBuffer.y;
    this._activeBuffer.savedCurAttrData.fg = this._curAttrData.fg;
    this._activeBuffer.savedCurAttrData.bg = this._curAttrData.bg;
    this._activeBuffer.savedCharset = this._charsetService.charset;
    this._activeBuffer.savedCharsets = this._charsetService.charsets.slice();
    this._activeBuffer.savedGlevel = this._charsetService.glevel;
    this._activeBuffer.savedOriginMode = this._coreService.decPrivateModes.origin;
    this._activeBuffer.savedWraparoundMode = this._coreService.decPrivateModes.wraparound;
    return true;
  }
  /**
   * CSI u
   * ESC 8
   *   Restore cursor (ANSI.SYS).
   *
   * @vt: #P[TODO...]  CSI SCORC "Restore Cursor"  "CSI u"   "Restore cursor position, charmap and text attributes."
   * @vt: #Y ESC  RC "Restore Cursor"  "ESC 8"   "Restore cursor position, charmap and text attributes."
   */
  restoreCursor(params) {
    this._activeBuffer.x = this._activeBuffer.savedX || 0;
    this._activeBuffer.y = Math.max(this._activeBuffer.savedY - this._activeBuffer.ybase, 0);
    this._curAttrData.fg = this._activeBuffer.savedCurAttrData.fg;
    this._curAttrData.bg = this._activeBuffer.savedCurAttrData.bg;
    for (let i = 0; i < this._activeBuffer.savedCharsets.length; i++) {
      this._charsetService.setgCharset(i, this._activeBuffer.savedCharsets[i]);
    }
    this._charsetService.setgLevel(this._activeBuffer.savedGlevel);
    this._coreService.decPrivateModes.origin = this._activeBuffer.savedOriginMode;
    this._coreService.decPrivateModes.wraparound = this._activeBuffer.savedWraparoundMode;
    this._restrictCursor();
    return true;
  }
  /**
   * OSC 2; <data> ST (set window title)
   *   Proxy to set window title.
   *
   * @vt: #P[Icon name is not exposed.]   OSC    0   "Set Windows Title and Icon Name"  "OSC 0 ; Pt BEL"  "Set window title and icon name."
   * Icon name is not supported. For Window Title see below.
   *
   * @vt: #Y     OSC    2   "Set Windows Title"  "OSC 2 ; Pt BEL"  "Set window title."
   * xterm.js does not manipulate the title directly, instead exposes changes via the event
   * `Terminal.onTitleChange`.
   */
  setTitle(data) {
    this._windowTitle = data;
    this._onTitleChange.fire(data);
    return true;
  }
  /**
   * OSC 1; <data> ST
   * Note: Icon name is not exposed.
   */
  setIconName(data) {
    this._iconName = data;
    return true;
  }
  /**
   * OSC 4; <num> ; <text> ST (set ANSI color <num> to <text>)
   *
   * @vt: #Y    OSC    4    "Set ANSI color"   "OSC 4 ; c ; spec BEL" "Change color number `c` to the color specified by `spec`."
   * `c` is the color index between 0 and 255. The color format of `spec` is derived from
   * `XParseColor` (see OSC 10 for supported formats). There may be multipe `c ; spec` pairs present
   * in the same instruction. If `spec` contains `?` the terminal returns a sequence with the
   * currently set color.
   */
  setOrReportIndexedColor(data) {
    const event = [];
    const slots = data.split(";");
    while (slots.length > 1) {
      const idx = slots.shift();
      const spec = slots.shift();
      if (/^\d+$/.exec(idx)) {
        const index = parseInt(idx, 10);
        if (isValidColorIndex(index)) {
          if (spec === "?") {
            event.push({ type: 0 /* REPORT */, index });
          } else {
            const color = parseColor(spec);
            if (color) {
              event.push({ type: 1 /* SET */, index, color });
            }
          }
        }
      }
    }
    if (event.length) {
      this._onColor.fire(event);
    }
    return true;
  }
  /**
   * OSC 8 ; <params> ; <uri> ST - create hyperlink
   * OSC 8 ; ; ST - finish hyperlink
   *
   * Test case:
   *
   * ```sh
   * printf '\e]8;;http://example.com\e\\This is a link\e]8;;\e\\\n'
   * ```
   *
   * @vt: #Y    OSC    8    "Create hyperlink"   "OSC 8 ; params ; uri BEL" "Create a hyperlink to `uri` using `params`."
   * `uri` is a hyperlink starting with `http://`, `https://`, `ftp://`, `file://` or `mailto://`. `params` is an
   * optional list of key=value assignments, separated by the : character.
   * Example: `id=xyz123:foo=bar:baz=quux`.
   * Currently only the id key is defined. Cells that share the same ID and URI share hover
   * feedback. Use `OSC 8 ; ; BEL` to finish the current hyperlink.
   */
  setHyperlink(data) {
    const idx = data.indexOf(";");
    if (idx === -1) {
      return true;
    }
    const id = data.slice(0, idx).trim();
    const uri = data.slice(idx + 1);
    if (uri) {
      return this._createHyperlink(id, uri);
    }
    if (id.trim()) {
      return false;
    }
    return this._finishHyperlink();
  }
  _createHyperlink(params, uri) {
    if (this._getCurrentLinkId()) {
      this._finishHyperlink();
    }
    const parsedParams = params.split(":");
    let id;
    const idParamIndex = parsedParams.findIndex((e) => e.startsWith("id="));
    if (idParamIndex !== -1) {
      id = parsedParams[idParamIndex].slice(3) || void 0;
    }
    this._curAttrData.extended = this._curAttrData.extended.clone();
    this._curAttrData.extended.urlId = this._oscLinkService.registerLink({ id, uri });
    this._curAttrData.updateExtended();
    return true;
  }
  _finishHyperlink() {
    this._curAttrData.extended = this._curAttrData.extended.clone();
    this._curAttrData.extended.urlId = 0;
    this._curAttrData.updateExtended();
    return true;
  }
  /**
   * Apply colors requests for special colors in OSC 10 | 11 | 12.
   * Since these commands are stacking from multiple parameters,
   * we handle them in a loop with an entry offset to `_specialColors`.
   */
  _setOrReportSpecialColor(data, offset) {
    const slots = data.split(";");
    for (let i = 0; i < slots.length; ++i, ++offset) {
      if (offset >= this._specialColors.length) break;
      if (slots[i] === "?") {
        this._onColor.fire([{ type: 0 /* REPORT */, index: this._specialColors[offset] }]);
      } else {
        const color = parseColor(slots[i]);
        if (color) {
          this._onColor.fire([{ type: 1 /* SET */, index: this._specialColors[offset], color }]);
        }
      }
    }
    return true;
  }
  /**
   * OSC 10 ; <xcolor name>|<?> ST - set or query default foreground color
   *
   * @vt: #Y  OSC   10    "Set or query default foreground color"   "OSC 10 ; Pt BEL"  "Set or query default foreground color."
   * To set the color, the following color specification formats are supported:
   * - `rgb:<red>/<green>/<blue>` for  `<red>, <green>, <blue>` in `h | hh | hhh | hhhh`, where
   *   `h` is a single hexadecimal digit (case insignificant). The different widths scale
   *   from 4 bit (`h`) to 16 bit (`hhhh`) and get converted to 8 bit (`hh`).
   * - `#RGB` - 4 bits per channel, expanded to `#R0G0B0`
   * - `#RRGGBB` - 8 bits per channel
   * - `#RRRGGGBBB` - 12 bits per channel, truncated to `#RRGGBB`
   * - `#RRRRGGGGBBBB` - 16 bits per channel, truncated to `#RRGGBB`
   *
   * **Note:** X11 named colors are currently unsupported.
   *
   * If `Pt` contains `?` instead of a color specification, the terminal
   * returns a sequence with the current default foreground color
   * (use that sequence to restore the color after changes).
   *
   * **Note:** Other than xterm, xterm.js does not support OSC 12 - 19.
   * Therefore stacking multiple `Pt` separated by `;` only works for the first two entries.
   */
  setOrReportFgColor(data) {
    return this._setOrReportSpecialColor(data, 0);
  }
  /**
   * OSC 11 ; <xcolor name>|<?> ST - set or query default background color
   *
   * @vt: #Y  OSC   11    "Set or query default background color"   "OSC 11 ; Pt BEL"  "Same as OSC 10, but for default background."
   */
  setOrReportBgColor(data) {
    return this._setOrReportSpecialColor(data, 1);
  }
  /**
   * OSC 12 ; <xcolor name>|<?> ST - set or query default cursor color
   *
   * @vt: #Y  OSC   12    "Set or query default cursor color"   "OSC 12 ; Pt BEL"  "Same as OSC 10, but for default cursor color."
   */
  setOrReportCursorColor(data) {
    return this._setOrReportSpecialColor(data, 2);
  }
  /**
   * OSC 104 ; <num> ST - restore ANSI color <num>
   *
   * @vt: #Y  OSC   104    "Reset ANSI color"   "OSC 104 ; c BEL" "Reset color number `c` to themed color."
   * `c` is the color index between 0 and 255. This function restores the default color for `c` as
   * specified by the loaded theme. Any number of `c` parameters may be given.
   * If no parameters are given, the entire indexed color table will be reset.
   */
  restoreIndexedColor(data) {
    if (!data) {
      this._onColor.fire([{ type: 2 /* RESTORE */ }]);
      return true;
    }
    const event = [];
    const slots = data.split(";");
    for (let i = 0; i < slots.length; ++i) {
      if (/^\d+$/.exec(slots[i])) {
        const index = parseInt(slots[i], 10);
        if (isValidColorIndex(index)) {
          event.push({ type: 2 /* RESTORE */, index });
        }
      }
    }
    if (event.length) {
      this._onColor.fire(event);
    }
    return true;
  }
  /**
   * OSC 110 ST - restore default foreground color
   *
   * @vt: #Y  OSC   110    "Restore default foreground color"   "OSC 110 BEL"  "Restore default foreground to themed color."
   */
  restoreFgColor(data) {
    this._onColor.fire([{ type: 2 /* RESTORE */, index: 256 /* FOREGROUND */ }]);
    return true;
  }
  /**
   * OSC 111 ST - restore default background color
   *
   * @vt: #Y  OSC   111    "Restore default background color"   "OSC 111 BEL"  "Restore default background to themed color."
   */
  restoreBgColor(data) {
    this._onColor.fire([{ type: 2 /* RESTORE */, index: 257 /* BACKGROUND */ }]);
    return true;
  }
  /**
   * OSC 112 ST - restore default cursor color
   *
   * @vt: #Y  OSC   112    "Restore default cursor color"   "OSC 112 BEL"  "Restore default cursor to themed color."
   */
  restoreCursorColor(data) {
    this._onColor.fire([{ type: 2 /* RESTORE */, index: 258 /* CURSOR */ }]);
    return true;
  }
  /**
   * ESC E
   * C1.NEL
   *   DEC mnemonic: NEL (https://vt100.net/docs/vt510-rm/NEL)
   *   Moves cursor to first position on next line.
   *
   * @vt: #Y   C1    NEL   "Next Line"   "\x85"    "Move the cursor to the beginning of the next row."
   * @vt: #Y   ESC   NEL   "Next Line"   "ESC E"   "Move the cursor to the beginning of the next row."
   */
  nextLine() {
    this._activeBuffer.x = 0;
    this.index();
    return true;
  }
  /**
   * ESC =
   *   DEC mnemonic: DECKPAM (https://vt100.net/docs/vt510-rm/DECKPAM.html)
   *   Enables the numeric keypad to send application sequences to the host.
   */
  keypadApplicationMode() {
    this._logService.debug("Serial port requested application keypad.");
    this._coreService.decPrivateModes.applicationKeypad = true;
    this._onRequestSyncScrollBar.fire();
    return true;
  }
  /**
   * ESC >
   *   DEC mnemonic: DECKPNM (https://vt100.net/docs/vt510-rm/DECKPNM.html)
   *   Enables the keypad to send numeric characters to the host.
   */
  keypadNumericMode() {
    this._logService.debug("Switching back to normal keypad.");
    this._coreService.decPrivateModes.applicationKeypad = false;
    this._onRequestSyncScrollBar.fire();
    return true;
  }
  /**
   * ESC % @
   * ESC % G
   *   Select default character set. UTF-8 is not supported (string are unicode anyways)
   *   therefore ESC % G does the same.
   */
  selectDefaultCharset() {
    this._charsetService.setgLevel(0);
    this._charsetService.setgCharset(0, DEFAULT_CHARSET);
    return true;
  }
  /**
   * ESC ( C
   *   Designate G0 Character Set, VT100, ISO 2022.
   * ESC ) C
   *   Designate G1 Character Set (ISO 2022, VT100).
   * ESC * C
   *   Designate G2 Character Set (ISO 2022, VT220).
   * ESC + C
   *   Designate G3 Character Set (ISO 2022, VT220).
   * ESC - C
   *   Designate G1 Character Set (VT300).
   * ESC . C
   *   Designate G2 Character Set (VT300).
   * ESC / C
   *   Designate G3 Character Set (VT300). C = A  -> ISO Latin-1 Supplemental. - Supported?
   */
  selectCharset(collectAndFlag) {
    if (collectAndFlag.length !== 2) {
      this.selectDefaultCharset();
      return true;
    }
    if (collectAndFlag[0] === "/") {
      return true;
    }
    this._charsetService.setgCharset(GLEVEL[collectAndFlag[0]], CHARSETS[collectAndFlag[1]] ?? DEFAULT_CHARSET);
    return true;
  }
  /**
   * ESC D
   * C1.IND
   *   DEC mnemonic: IND (https://vt100.net/docs/vt510-rm/IND.html)
   *   Moves the cursor down one line in the same column.
   *
   * @vt: #Y   C1    IND   "Index"   "\x84"    "Move the cursor one line down scrolling if needed."
   * @vt: #Y   ESC   IND   "Index"   "ESC D"   "Move the cursor one line down scrolling if needed."
   */
  index() {
    this._restrictCursor();
    this._activeBuffer.y++;
    if (this._activeBuffer.y === this._activeBuffer.scrollBottom + 1) {
      this._activeBuffer.y--;
      this._bufferService.scroll(this._eraseAttrData());
    } else if (this._activeBuffer.y >= this._bufferService.rows) {
      this._activeBuffer.y = this._bufferService.rows - 1;
    }
    this._restrictCursor();
    return true;
  }
  /**
   * ESC H
   * C1.HTS
   *   DEC mnemonic: HTS (https://vt100.net/docs/vt510-rm/HTS.html)
   *   Sets a horizontal tab stop at the column position indicated by
   *   the value of the active column when the terminal receives an HTS.
   *
   * @vt: #Y   C1    HTS   "Horizontal Tabulation Set" "\x88"    "Places a tab stop at the current cursor position."
   * @vt: #Y   ESC   HTS   "Horizontal Tabulation Set" "ESC H"   "Places a tab stop at the current cursor position."
   */
  tabSet() {
    this._activeBuffer.tabs[this._activeBuffer.x] = true;
    return true;
  }
  /**
   * ESC M
   * C1.RI
   *   DEC mnemonic: HTS
   *   Moves the cursor up one line in the same column. If the cursor is at the top margin,
   *   the page scrolls down.
   *
   * @vt: #Y ESC  IR "Reverse Index" "ESC M"  "Move the cursor one line up scrolling if needed."
   */
  reverseIndex() {
    this._restrictCursor();
    if (this._activeBuffer.y === this._activeBuffer.scrollTop) {
      const scrollRegionHeight = this._activeBuffer.scrollBottom - this._activeBuffer.scrollTop;
      this._activeBuffer.lines.shiftElements(this._activeBuffer.ybase + this._activeBuffer.y, scrollRegionHeight, 1);
      this._activeBuffer.lines.set(this._activeBuffer.ybase + this._activeBuffer.y, this._activeBuffer.getBlankLine(this._eraseAttrData()));
      this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
    } else {
      this._activeBuffer.y--;
      this._restrictCursor();
    }
    return true;
  }
  /**
   * ESC c
   *   DEC mnemonic: RIS (https://vt100.net/docs/vt510-rm/RIS.html)
   *   Reset to initial state.
   *
   * @vt: #Y ESC  RIS "Full Reset" "ESC c"  "Reset to initial state."
   */
  fullReset() {
    this._parser.reset();
    this._onRequestReset.fire();
    return true;
  }
  reset() {
    this._curAttrData = DEFAULT_ATTR_DATA.clone();
    this._eraseAttrDataInternal = DEFAULT_ATTR_DATA.clone();
  }
  /**
   * back_color_erase feature for xterm.
   */
  _eraseAttrData() {
    this._eraseAttrDataInternal.bg &= ~(50331648 /* CM_MASK */ | 16777215);
    this._eraseAttrDataInternal.bg |= this._curAttrData.bg & ~4227858432;
    return this._eraseAttrDataInternal;
  }
  /**
   * ESC n
   * ESC o
   * ESC |
   * ESC }
   * ESC ~
   *   DEC mnemonic: LS (https://vt100.net/docs/vt510-rm/LS.html)
   *   When you use a locking shift, the character set remains in GL or GR until
   *   you use another locking shift. (partly supported)
   */
  setgLevel(level) {
    this._charsetService.setgLevel(level);
    return true;
  }
  /**
   * ESC # 8
   *   DEC mnemonic: DECALN (https://vt100.net/docs/vt510-rm/DECALN.html)
   *   This control function fills the complete screen area with
   *   a test pattern (E) used for adjusting screen alignment.
   *
   * @vt: #Y   ESC   DECALN   "Screen Alignment Pattern"  "ESC # 8"  "Fill viewport with a test pattern (E)."
   */
  screenAlignmentPattern() {
    const cell = new CellData();
    cell.content = 1 << 22 /* WIDTH_SHIFT */ | "E".charCodeAt(0);
    cell.fg = this._curAttrData.fg;
    cell.bg = this._curAttrData.bg;
    this._setCursor(0, 0);
    for (let yOffset = 0; yOffset < this._bufferService.rows; ++yOffset) {
      const row = this._activeBuffer.ybase + this._activeBuffer.y + yOffset;
      const line = this._activeBuffer.lines.get(row);
      if (line) {
        line.fill(cell);
        line.isWrapped = false;
      }
    }
    this._dirtyRowTracker.markAllDirty();
    this._setCursor(0, 0);
    return true;
  }
  /**
   * DCS $ q Pt ST
   *   DECRQSS (https://vt100.net/docs/vt510-rm/DECRQSS.html)
   *   Request Status String (DECRQSS), VT420 and up.
   *   Response: DECRPSS (https://vt100.net/docs/vt510-rm/DECRPSS.html)
   *
   * @vt: #P[Limited support, see below.]  DCS   DECRQSS   "Request Selection or Setting"  "DCS $ q Pt ST"   "Request several terminal settings."
   * Response is in the form `ESC P 1 $ r Pt ST` for valid requests, where `Pt` contains the
   * corresponding CSI string, `ESC P 0 ST` for invalid requests.
   *
   * Supported requests and responses:
   *
   * | Type                             | Request           | Response (`Pt`)                                       |
   * | -------------------------------- | ----------------- | ----------------------------------------------------- |
   * | Graphic Rendition (SGR)          | `DCS $ q m ST`    | always reporting `0m` (currently broken)              |
   * | Top and Bottom Margins (DECSTBM) | `DCS $ q r ST`    | `Ps ; Ps r`                                           |
   * | Cursor Style (DECSCUSR)          | `DCS $ q SP q ST` | `Ps SP q`                                             |
   * | Protection Attribute (DECSCA)    | `DCS $ q " q ST`  | `Ps " q` (DECSCA 2 is reported as Ps = 0)             |
   * | Conformance Level (DECSCL)       | `DCS $ q " p ST`  | always reporting `61 ; 1 " p` (DECSCL is unsupported) |
   *
   *
   * TODO:
   * - fix SGR report
   * - either check which conformance is better suited or remove the report completely
   *   --> we are currently a mixture of all up to VT400 but dont follow anyone strictly
   */
  requestStatusString(data, params) {
    const f = (s) => {
      this._coreService.triggerDataEvent(`${"\x1B" /* ESC */}${s}${"\x1B" /* ESC */}\\`);
      return true;
    };
    const b = this._bufferService.buffer;
    const opts = this._optionsService.rawOptions;
    const STYLES = { "block": 2, "underline": 4, "bar": 6 };
    if (data === '"q') return f(`P1$r${this._curAttrData.isProtected() ? 1 : 0}"q`);
    if (data === '"p') return f(`P1$r61;1"p`);
    if (data === "r") return f(`P1$r${b.scrollTop + 1};${b.scrollBottom + 1}r`);
    if (data === "m") return f(`P1$r0m`);
    if (data === " q") return f(`P1$r${STYLES[opts.cursorStyle] - (opts.cursorBlink ? 1 : 0)} q`);
    return f(`P0$r`);
  }
  markRangeDirty(y1, y2) {
    this._dirtyRowTracker.markRangeDirty(y1, y2);
  }
  // #region Kitty keyboard
  /**
   * CSI = flags ; mode u
   * Set Kitty keyboard protocol flags.
   * mode: 1=set, 2=set-only-specified, 3=reset-only-specified
   *
   * @vt: #Y CSI KKBDSET "Kitty Keyboard Set" "CSI = Ps ; Pm u" "Set Kitty keyboard protocol flags."
   */
  kittyKeyboardSet(params) {
    if (!this._optionsService.rawOptions.vtExtensions?.kittyKeyboard) {
      return true;
    }
    const flags = params.params[0] || 0;
    const mode = params.length > 1 ? params.params[1] || 1 : 1;
    const state = this._coreService.kittyKeyboard;
    switch (mode) {
      case 1:
        state.flags = flags;
        break;
      case 2:
        state.flags |= flags;
        break;
      case 3:
        state.flags &= ~flags;
        break;
    }
    return true;
  }
  /**
   * CSI ? u
   * Query Kitty keyboard protocol flags.
   * Terminal responds with CSI ? flags u
   *
   * @vt: #Y CSI KKBDQUERY "Kitty Keyboard Query" "CSI ? u" "Query Kitty keyboard protocol flags."
   */
  kittyKeyboardQuery(params) {
    if (!this._optionsService.rawOptions.vtExtensions?.kittyKeyboard) {
      return true;
    }
    const flags = this._coreService.kittyKeyboard.flags;
    this._coreService.triggerDataEvent(`${"\x1B" /* ESC */}[?${flags}u`);
    return true;
  }
  /**
   * CSI > flags u
   * Push Kitty keyboard flags onto stack and set new flags.
   *
   * @vt: #Y CSI KKBDPUSH "Kitty Keyboard Push" "CSI > Ps u" "Push keyboard flags to stack and set new flags."
   */
  kittyKeyboardPush(params) {
    if (!this._optionsService.rawOptions.vtExtensions?.kittyKeyboard) {
      return true;
    }
    const flags = params.params[0] || 0;
    const state = this._coreService.kittyKeyboard;
    const isAlt = this._bufferService.buffer === this._bufferService.buffers.alt;
    const stack = isAlt ? state.altStack : state.mainStack;
    if (stack.length >= 16) {
      stack.shift();
    }
    stack.push(state.flags);
    state.flags = flags;
    return true;
  }
  /**
   * CSI < count u
   * Pop Kitty keyboard flags from stack.
   *
   * @vt: #Y CSI KKBDPOP "Kitty Keyboard Pop" "CSI < Ps u" "Pop keyboard flags from stack."
   */
  kittyKeyboardPop(params) {
    if (!this._optionsService.rawOptions.vtExtensions?.kittyKeyboard) {
      return true;
    }
    const count = Math.max(1, params.params[0] || 1);
    const state = this._coreService.kittyKeyboard;
    const isAlt = this._bufferService.buffer === this._bufferService.buffers.alt;
    const stack = isAlt ? state.altStack : state.mainStack;
    for (let i = 0; i < count && stack.length > 0; i++) {
      state.flags = stack.pop();
    }
    if (stack.length === 0 && count > 0) {
      state.flags = 0;
    }
    return true;
  }
  // #endregion
};
var DirtyRowTracker = class {
  constructor(_bufferService) {
    this._bufferService = _bufferService;
    this.clearRange();
  }
  clearRange() {
    this.start = this._bufferService.buffer.y;
    this.end = this._bufferService.buffer.y;
  }
  markDirty(y) {
    if (y < this.start) {
      this.start = y;
    } else if (y > this.end) {
      this.end = y;
    }
  }
  markRangeDirty(y1, y2) {
    if (y1 > y2) {
      $temp = y1;
      y1 = y2;
      y2 = $temp;
    }
    if (y1 < this.start) {
      this.start = y1;
    }
    if (y2 > this.end) {
      this.end = y2;
    }
  }
  markAllDirty() {
    this.markRangeDirty(0, this._bufferService.rows - 1);
  }
};
DirtyRowTracker = __decorateClass([
  __decorateParam(0, IBufferService)
], DirtyRowTracker);
function isValidColorIndex(value) {
  return 0 <= value && value < 256;
}

// src/common/input/WriteBuffer.ts
var WriteBuffer = class extends Disposable {
  constructor(_action) {
    super();
    this._action = _action;
    this._writeBuffer = [];
    this._callbacks = [];
    this._pendingData = 0;
    this._bufferOffset = 0;
    this._isSyncWriting = false;
    this._syncCalls = 0;
    this._didUserInput = false;
    this._innerWriteTimer = this._register(new TimeoutTimer());
    this._onWriteParsed = this._register(new Emitter());
    this.onWriteParsed = this._onWriteParsed.event;
    this._register(toDisposable(() => {
      this._writeBuffer.length = 0;
      this._callbacks.length = 0;
      this._pendingData = 0;
      this._bufferOffset = 0;
    }));
  }
  handleUserInput() {
    this._didUserInput = true;
  }
  /**
   * Flushes all pending writes synchronously. This is useful when you need to
   * ensure all queued data is processed before performing an operation that
   * depends upon everything being parsed like resize.
   *
   * Note: This is unreliable with async parser handlers as it does not wait for
   * promises to resolve.
   */
  flushSync() {
    if (this._store.isDisposed) {
      return;
    }
    if (this._isSyncWriting) {
      return;
    }
    this._isSyncWriting = true;
    let chunk;
    let didProcess = false;
    while (chunk = this._writeBuffer.shift()) {
      didProcess = true;
      this._action(chunk);
      const cb = this._callbacks.shift();
      if (cb) cb();
    }
    this._pendingData = 0;
    this._bufferOffset = 2147483647;
    this._writeBuffer.length = 0;
    this._callbacks.length = 0;
    this._isSyncWriting = false;
    if (didProcess) {
      this._onWriteParsed.fire();
    }
  }
  /**
   * @deprecated Unreliable, to be removed soon.
   */
  writeSync(data, maxSubsequentCalls) {
    if (this._store.isDisposed) {
      return;
    }
    if (maxSubsequentCalls !== void 0 && this._syncCalls > maxSubsequentCalls) {
      this._syncCalls = 0;
      return;
    }
    this._pendingData += data.length;
    this._writeBuffer.push(data);
    this._callbacks.push(void 0);
    this._syncCalls++;
    if (this._isSyncWriting) {
      return;
    }
    this._isSyncWriting = true;
    let chunk;
    while (chunk = this._writeBuffer.shift()) {
      this._action(chunk);
      const cb = this._callbacks.shift();
      if (cb) cb();
    }
    this._pendingData = 0;
    this._bufferOffset = 2147483647;
    this._isSyncWriting = false;
    this._syncCalls = 0;
  }
  write(data, callback) {
    if (this._store.isDisposed) {
      return;
    }
    if (this._pendingData > 5e7 /* DISCARD_WATERMARK */) {
      throw new Error("write data discarded, use flow control to avoid losing data");
    }
    if (!this._writeBuffer.length) {
      this._bufferOffset = 0;
      if (this._didUserInput) {
        this._didUserInput = false;
        this._pendingData += data.length;
        this._writeBuffer.push(data);
        this._callbacks.push(callback);
        this._innerWrite();
        return;
      }
      this._scheduleInnerWrite();
    }
    this._pendingData += data.length;
    this._writeBuffer.push(data);
    this._callbacks.push(callback);
  }
  /**
   * Inner write call, that enters the sliced chunk processing by timing.
   *
   * `lastTime` indicates, when the last _innerWrite call had started.
   * It is used to aggregate async handler execution under a timeout constraint
   * effectively lowering the redrawing needs, schematically:
   *
   *   macroTask _innerWrite:
   *     if (performance.now() - (lastTime | 0) < Constants.WRITE_TIMEOUT_MS):
   *        schedule microTask _innerWrite(lastTime)
   *     else:
   *        schedule macroTask _innerWrite(0)
   *
   *   overall execution order on task queues:
   *
   *   macrotasks:  [...]  -->  _innerWrite(0)  -->  [...]  -->  screenUpdate  -->  [...]
   *         m  t:                    |
   *         i  a:                  [...]
   *         c  s:                    |
   *         r  k:              while < timeout:
   *         o  s:                _innerWrite(timeout)
   *
   * `promiseResult` depicts the promise resolve value of an async handler.
   * This value gets carried forward through all saved stack states of the
   * paused parser for proper continuation.
   *
   * Note, for pure sync code `lastTime` and `promiseResult` have no meaning.
   */
  _scheduleInnerWrite(lastTime = 0, promiseResult = true) {
    if (this._store.isDisposed) {
      return;
    }
    this._innerWriteTimer.cancelAndSet(() => this._innerWrite(lastTime, promiseResult), 0);
  }
  _innerWrite(lastTime = 0, promiseResult = true) {
    if (this._store.isDisposed) {
      return;
    }
    const startTime = lastTime || performance.now();
    while (this._writeBuffer.length > this._bufferOffset) {
      const data = this._writeBuffer[this._bufferOffset];
      const result = this._action(data, promiseResult);
      if (result) {
        const continuation = (r) => {
          if (this._store.isDisposed) {
            return;
          }
          if (performance.now() - startTime >= 12 /* WRITE_TIMEOUT_MS */) {
            this._scheduleInnerWrite(0, r);
          } else {
            this._innerWrite(startTime, r);
          }
        };
        result.catch((err) => {
          queueMicrotask(() => {
            throw err;
          });
          return Promise.resolve(false);
        }).then(continuation);
        return;
      }
      const cb = this._callbacks[this._bufferOffset];
      if (cb) cb();
      this._bufferOffset++;
      this._pendingData -= data.length;
      if (performance.now() - startTime >= 12 /* WRITE_TIMEOUT_MS */) {
        break;
      }
    }
    if (this._writeBuffer.length > this._bufferOffset) {
      if (this._bufferOffset > 50 /* WRITE_BUFFER_LENGTH_THRESHOLD */) {
        this._writeBuffer = this._writeBuffer.slice(this._bufferOffset);
        this._callbacks = this._callbacks.slice(this._bufferOffset);
        this._bufferOffset = 0;
      }
      this._scheduleInnerWrite();
    } else {
      this._writeBuffer.length = 0;
      this._callbacks.length = 0;
      this._pendingData = 0;
      this._bufferOffset = 0;
    }
    this._onWriteParsed.fire();
  }
};

// src/common/services/OscLinkService.ts
var OscLinkService = class {
  constructor(_bufferService) {
    this._bufferService = _bufferService;
    this._nextId = 1;
    /**
     * A map of the link key to link entry. This is used to add additional lines to links with ids.
     */
    this._entriesWithId = /* @__PURE__ */ new Map();
    /**
     * A map of the link id to the link entry. The "link id" (number) which is the numberic
     * representation of a unique link should not be confused with "id" (string) which comes in with
     * `id=` in the OSC link's properties.
     */
    this._dataByLinkId = /* @__PURE__ */ new Map();
  }
  registerLink(data) {
    const buffer = this._bufferService.buffer;
    if (data.id === void 0) {
      const marker2 = buffer.addMarker(buffer.ybase + buffer.y);
      const entry2 = {
        data,
        id: this._nextId++,
        lines: [marker2]
      };
      marker2.onDispose(() => this._removeMarkerFromLink(entry2, marker2));
      this._dataByLinkId.set(entry2.id, entry2);
      return entry2.id;
    }
    const castData = data;
    const key = this._getEntryIdKey(castData);
    const match = this._entriesWithId.get(key);
    if (match) {
      this.addLineToLink(match.id, buffer.ybase + buffer.y);
      return match.id;
    }
    const marker = buffer.addMarker(buffer.ybase + buffer.y);
    const entry = {
      id: this._nextId++,
      key: this._getEntryIdKey(castData),
      data: castData,
      lines: [marker]
    };
    marker.onDispose(() => this._removeMarkerFromLink(entry, marker));
    this._entriesWithId.set(entry.key, entry);
    this._dataByLinkId.set(entry.id, entry);
    return entry.id;
  }
  addLineToLink(linkId, y) {
    const entry = this._dataByLinkId.get(linkId);
    if (!entry) {
      return;
    }
    if (entry.lines.every((e) => e.line !== y)) {
      const marker = this._bufferService.buffer.addMarker(y);
      entry.lines.push(marker);
      marker.onDispose(() => this._removeMarkerFromLink(entry, marker));
    }
  }
  getLinkData(linkId) {
    return this._dataByLinkId.get(linkId)?.data;
  }
  _getEntryIdKey(linkData) {
    return `${linkData.id};;${linkData.uri}`;
  }
  _removeMarkerFromLink(entry, marker) {
    const index = entry.lines.indexOf(marker);
    if (index === -1) {
      return;
    }
    entry.lines.splice(index, 1);
    if (entry.lines.length === 0) {
      if (entry.data.id !== void 0) {
        this._entriesWithId.delete(entry.key);
      }
      this._dataByLinkId.delete(entry.id);
    }
  }
};
OscLinkService = __decorateClass([
  __decorateParam(0, IBufferService)
], OscLinkService);

// src/common/CoreTerminal.ts
var hasWriteSyncWarnHappened = false;
var CoreTerminal = class extends Disposable {
  constructor(options) {
    super();
    this._windowsWrappingHeuristics = this._register(new MutableDisposable());
    this._onBinary = this._register(new Emitter());
    this.onBinary = this._onBinary.event;
    this._onData = this._register(new Emitter());
    this.onData = this._onData.event;
    this._onLineFeed = this._register(new Emitter());
    this.onLineFeed = this._onLineFeed.event;
    this._onRender = this._register(new Emitter());
    this.onRender = this._onRender.event;
    this._onResize = this._register(new Emitter());
    this.onResize = this._onResize.event;
    this._onWriteParsed = this._register(new Emitter());
    this.onWriteParsed = this._onWriteParsed.event;
    this._onScroll = this._register(new Emitter());
    this._instantiationService = new InstantiationService();
    this.optionsService = this._register(new OptionsService(options));
    this._instantiationService.setService(IOptionsService, this.optionsService);
    this._logService = this._register(this._instantiationService.createInstance(LogService));
    this._instantiationService.setService(ILogService, this._logService);
    this._bufferService = this._register(this._instantiationService.createInstance(BufferService));
    this._instantiationService.setService(IBufferService, this._bufferService);
    this.coreService = this._register(this._instantiationService.createInstance(CoreService));
    this._instantiationService.setService(ICoreService, this.coreService);
    this.mouseStateService = this._register(this._instantiationService.createInstance(MouseStateService));
    this._instantiationService.setService(IMouseStateService, this.mouseStateService);
    this.unicodeService = this._register(this._instantiationService.createInstance(UnicodeService));
    this.unicodeService.register(new UnicodeV6());
    this._instantiationService.setService(IUnicodeService, this.unicodeService);
    this._charsetService = this._instantiationService.createInstance(CharsetService);
    this._instantiationService.setService(ICharsetService, this._charsetService);
    this._oscLinkService = this._instantiationService.createInstance(OscLinkService);
    this._instantiationService.setService(IOscLinkService, this._oscLinkService);
    this._inputHandler = this._register(new InputHandler(this._bufferService, this._charsetService, this.coreService, this._logService, this.optionsService, this._oscLinkService, this.mouseStateService, this.unicodeService));
    this._register(EventUtils.forward(this._inputHandler.onLineFeed, this._onLineFeed));
    this._register(EventUtils.forward(this._bufferService.onResize, this._onResize));
    this._register(EventUtils.forward(this.coreService.onData, this._onData));
    this._register(EventUtils.forward(this.coreService.onBinary, this._onBinary));
    this._register(this.coreService.onRequestScrollToBottom(() => this.scrollToBottom(true)));
    this._register(this.coreService.onUserInput(() => this._writeBuffer.handleUserInput()));
    this._register(this.optionsService.onMultipleOptionChange(["windowsPty"], () => this._handleWindowsPtyOptionChange()));
    this._register(this._bufferService.onScroll(() => {
      this._onScroll.fire({ position: this._bufferService.buffer.ydisp });
      this._inputHandler.markRangeDirty(this._bufferService.buffer.scrollTop, this._bufferService.buffer.scrollBottom);
    }));
    this._writeBuffer = this._register(new WriteBuffer((data, promiseResult) => this._inputHandler.parse(data, promiseResult)));
    this._register(EventUtils.forward(this._writeBuffer.onWriteParsed, this._onWriteParsed));
  }
  get onScroll() {
    if (!this._onScrollApi) {
      this._onScrollApi = this._register(new Emitter());
      this._onScroll.event((ev) => {
        this._onScrollApi?.fire(ev.position);
      });
    }
    return this._onScrollApi.event;
  }
  get cols() {
    return this._bufferService.cols;
  }
  get rows() {
    return this._bufferService.rows;
  }
  get buffers() {
    return this._bufferService.buffers;
  }
  get options() {
    return this.optionsService.options;
  }
  set options(options) {
    for (const key in options) {
      this.optionsService.options[key] = options[key];
    }
  }
  write(data, callback) {
    this._writeBuffer.write(data, callback);
  }
  /**
   * Write data to terminal synchonously.
   *
   * This method is unreliable with async parser handlers, thus should not
   * be used anymore. If you need blocking semantics on data input consider
   * `write` with a callback instead.
   *
   * @deprecated Unreliable, will be removed soon.
   */
  writeSync(data, maxSubsequentCalls) {
    if (this._logService.logLevel <= 3 /* WARN */ && !hasWriteSyncWarnHappened) {
      this._logService.warn("writeSync is unreliable and will be removed soon.");
      hasWriteSyncWarnHappened = true;
    }
    this._writeBuffer.writeSync(data, maxSubsequentCalls);
  }
  input(data, wasUserInput = true) {
    this.coreService.triggerDataEvent(data, wasUserInput);
  }
  resize(x, y) {
    if (isNaN(x) || isNaN(y)) {
      return;
    }
    x = Math.max(x, 2 /* MINIMUM_COLS */);
    y = Math.max(y, 1 /* MINIMUM_ROWS */);
    this._writeBuffer.flushSync();
    this._bufferService.resize(x, y);
  }
  /**
   * Scroll the terminal down 1 row, creating a blank line.
   * @param eraseAttr The attribute data to use the for blank line.
   * @param isWrapped Whether the new line is wrapped from the previous line.
   */
  scroll(eraseAttr, isWrapped = false) {
    this._bufferService.scroll(eraseAttr, isWrapped);
  }
  /**
   * Scroll the display of the terminal
   * @param disp The number of lines to scroll down (negative scroll up).
   * @param suppressScrollEvent Don't emit the scroll event as scrollLines. This is used to avoid
   * unwanted events being handled by the viewport when the event was triggered from the viewport
   * originally.
   */
  scrollLines(disp, suppressScrollEvent) {
    this._bufferService.scrollLines(disp, suppressScrollEvent);
  }
  scrollPages(pageCount) {
    this.scrollLines(pageCount * (this.rows - 1));
  }
  scrollToTop() {
    this.scrollLines(-this._bufferService.buffer.ydisp);
  }
  scrollToBottom(disableSmoothScroll) {
    this.scrollLines(this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
  }
  scrollToLine(line) {
    const scrollAmount = line - this._bufferService.buffer.ydisp;
    if (scrollAmount !== 0) {
      this.scrollLines(scrollAmount);
    }
  }
  /** Add handler for ESC escape sequence. See xterm.d.ts for details. */
  registerEscHandler(id, callback) {
    return this._inputHandler.registerEscHandler(id, callback);
  }
  /** Add handler for DCS escape sequence. See xterm.d.ts for details. */
  registerDcsHandler(id, callback) {
    return this._inputHandler.registerDcsHandler(id, callback);
  }
  /** Add handler for CSI escape sequence. See xterm.d.ts for details. */
  registerCsiHandler(id, callback) {
    return this._inputHandler.registerCsiHandler(id, callback);
  }
  /** Add handler for OSC escape sequence. See xterm.d.ts for details. */
  registerOscHandler(ident, callback) {
    return this._inputHandler.registerOscHandler(ident, callback);
  }
  /** Add handler for APC escape sequence. See xterm.d.ts for details. */
  registerApcHandler(id, callback) {
    return this._inputHandler.registerApcHandler(id, callback);
  }
  _setup() {
    this._handleWindowsPtyOptionChange();
  }
  reset() {
    this._inputHandler.reset();
    this._bufferService.reset();
    this._charsetService.reset();
    this.coreService.reset();
    this.mouseStateService.reset();
  }
  _handleWindowsPtyOptionChange() {
    let value = false;
    const windowsPty = this.optionsService.rawOptions.windowsPty;
    if (windowsPty && windowsPty.backend !== void 0 && windowsPty.buildNumber !== void 0) {
      value = !!(windowsPty.backend === "conpty" && windowsPty.buildNumber < 21376);
    }
    if (value) {
      this._enableWindowsWrappingHeuristics();
    } else {
      this._windowsWrappingHeuristics.clear();
    }
  }
  _enableWindowsWrappingHeuristics() {
    if (!this._windowsWrappingHeuristics.value) {
      const disposables = [];
      disposables.push(this.onLineFeed(updateWindowsModeWrappedState.bind(null, this._bufferService)));
      disposables.push(this.registerCsiHandler({ final: "H" }, () => {
        updateWindowsModeWrappedState(this._bufferService);
        return false;
      }));
      this._windowsWrappingHeuristics.value = toDisposable(() => {
        for (const d of disposables) {
          d.dispose();
        }
      });
    }
  }
};

// src/headless/Terminal.ts
var Terminal = class extends CoreTerminal {
  constructor(options = {}) {
    super(options);
    this._onBell = this._register(new Emitter());
    this.onBell = this._onBell.event;
    this._onCursorMove = this._register(new Emitter());
    this.onCursorMove = this._onCursorMove.event;
    this._onTitleChange = this._register(new Emitter());
    this.onTitleChange = this._onTitleChange.event;
    this._onA11yCharEmitter = this._register(new Emitter());
    this.onA11yChar = this._onA11yCharEmitter.event;
    this._onA11yTabEmitter = this._register(new Emitter());
    this.onA11yTab = this._onA11yTabEmitter.event;
    this._setup();
    this._register(this._inputHandler.onRequestBell(() => this.bell()));
    this._register(this._inputHandler.onRequestReset(() => this.reset()));
    this._register(EventUtils.forward(this._inputHandler.onCursorMove, this._onCursorMove));
    this._register(EventUtils.forward(this._inputHandler.onTitleChange, this._onTitleChange));
    this._register(EventUtils.forward(this._inputHandler.onA11yChar, this._onA11yCharEmitter));
    this._register(EventUtils.forward(this._inputHandler.onA11yTab, this._onA11yTabEmitter));
    this._register(EventUtils.forward(EventUtils.map(this._inputHandler.onRequestRefreshRows, (e) => ({ start: e?.start ?? 0, end: e?.end ?? this.rows - 1 })), this._onRender));
  }
  /**
   * Convenience property to active buffer.
   */
  get buffer() {
    return this.buffers.active;
  }
  // TODO: Support paste here?
  get markers() {
    return this.buffer.markers;
  }
  registerMarker(cursorYOffset) {
    return this.buffer.addMarker(this.buffer.ybase + this.buffer.y + cursorYOffset);
  }
  bell() {
    this._onBell.fire();
  }
  input(data, wasUserInput = true) {
    this.coreService.triggerDataEvent(data, wasUserInput);
  }
  /**
   * Resizes the terminal.
   *
   * @param x The number of columns to resize to.
   * @param y The number of rows to resize to.
   */
  resize(x, y) {
    if (x === this.cols && y === this.rows) {
      return;
    }
    super.resize(x, y);
  }
  /**
   * Clear the entire buffer, making the prompt line the new first line.
   */
  clear() {
    this.buffer.clearAllMarkers();
    this.buffer.lines.set(0, this.buffer.lines.get(this.buffer.ybase + this.buffer.y));
    this.buffer.lines.length = 1;
    this.buffer.ydisp = 0;
    this.buffer.ybase = 0;
    this.buffer.y = 0;
    for (let i = 1; i < this.rows; i++) {
      this.buffer.lines.push(this.buffer.getBlankLine(DEFAULT_ATTR_DATA));
    }
    this._onScroll.fire({ position: this.buffer.ydisp });
  }
  /**
   * Reset terminal.
   * Note: Calling this directly from JS is synchronous but does not clear
   * input buffers and does not reset the parser, thus the terminal will
   * continue to apply pending input data.
   * If you need in band reset (synchronous with input data) consider
   * using DECSTR (soft reset, CSI ! p) or RIS instead (hard reset, ESC c).
   */
  reset() {
    this.options.rows = this.rows;
    this.options.cols = this.cols;
    this._setup();
    super.reset();
  }
};

// src/common/public/AddonManager.ts
var AddonManager = class {
  constructor() {
    this._addons = [];
  }
  dispose() {
    for (let i = this._addons.length - 1; i >= 0; i--) {
      this._addons[i].instance.dispose();
    }
  }
  loadAddon(terminal, instance) {
    const loadedAddon = {
      instance,
      dispose: instance.dispose,
      isDisposed: false
    };
    this._addons.push(loadedAddon);
    instance.dispose = () => this._wrappedAddonDispose(loadedAddon);
    instance.activate(terminal);
  }
  _wrappedAddonDispose(loadedAddon) {
    if (loadedAddon.isDisposed) {
      return;
    }
    let index = -1;
    for (let i = 0; i < this._addons.length; i++) {
      if (this._addons[i] === loadedAddon) {
        index = i;
        break;
      }
    }
    if (index === -1) {
      throw new Error("Could not dispose an addon that has not been loaded");
    }
    loadedAddon.isDisposed = true;
    loadedAddon.dispose.apply(loadedAddon.instance);
    this._addons.splice(index, 1);
  }
};

// src/headless/public/Terminal.ts
var CONSTRUCTOR_ONLY_OPTIONS = ["cols", "rows"];
var Terminal2 = class extends Disposable {
  constructor(options) {
    super();
    this._core = this._register(new Terminal(options));
    this._addonManager = this._register(new AddonManager());
    this._publicOptions = { ...this._core.options };
    const getter = (propName) => {
      return this._core.options[propName];
    };
    const setter = (propName, value) => {
      this._checkReadonlyOptions(propName);
      this._core.options[propName] = value;
    };
    for (const propName in this._core.options) {
      const desc = {
        get: getter.bind(this, propName),
        set: setter.bind(this, propName)
      };
      Object.defineProperty(this._publicOptions, propName, desc);
    }
  }
  _checkReadonlyOptions(propName) {
    if (CONSTRUCTOR_ONLY_OPTIONS.includes(propName)) {
      throw new Error(`Option "${propName}" can only be set in the constructor`);
    }
  }
  _checkProposedApi() {
    if (!this._core.optionsService.options.allowProposedApi) {
      throw new Error("You must set the allowProposedApi option to true to use proposed API");
    }
  }
  get onBell() {
    return this._core.onBell;
  }
  get onBinary() {
    return this._core.onBinary;
  }
  get onCursorMove() {
    return this._core.onCursorMove;
  }
  get onData() {
    return this._core.onData;
  }
  get onLineFeed() {
    return this._core.onLineFeed;
  }
  get onRender() {
    return this._core.onRender;
  }
  get onResize() {
    return this._core.onResize;
  }
  get onScroll() {
    return this._core.onScroll;
  }
  get onTitleChange() {
    return this._core.onTitleChange;
  }
  get onWriteParsed() {
    return this._core.onWriteParsed;
  }
  get parser() {
    this._parser ??= new ParserApi(this._core);
    return this._parser;
  }
  get unicode() {
    this._checkProposedApi();
    return new UnicodeApi(this._core);
  }
  get rows() {
    return this._core.rows;
  }
  get cols() {
    return this._core.cols;
  }
  get buffer() {
    this._buffer ??= this._register(new BufferNamespaceApi(this._core));
    return this._buffer;
  }
  get markers() {
    return this._core.markers;
  }
  get modes() {
    const m = this._core.coreService.decPrivateModes;
    let mouseTrackingMode = "none";
    switch (this._core.mouseStateService.activeProtocol) {
      case "X10":
        mouseTrackingMode = "x10";
        break;
      case "VT200":
        mouseTrackingMode = "vt200";
        break;
      case "DRAG":
        mouseTrackingMode = "drag";
        break;
      case "ANY":
        mouseTrackingMode = "any";
        break;
    }
    return {
      applicationCursorKeysMode: m.applicationCursorKeys,
      applicationKeypadMode: m.applicationKeypad,
      bracketedPasteMode: m.bracketedPasteMode,
      insertMode: this._core.coreService.modes.insertMode,
      mouseTrackingMode,
      originMode: m.origin,
      reverseWraparoundMode: m.reverseWraparound,
      sendFocusMode: m.sendFocus,
      showCursor: !this._core.coreService.isCursorHidden,
      synchronizedOutputMode: m.synchronizedOutput,
      win32InputMode: m.win32InputMode,
      wraparoundMode: m.wraparound
    };
  }
  get options() {
    return this._publicOptions;
  }
  set options(options) {
    for (const propName in options) {
      this._publicOptions[propName] = options[propName];
    }
  }
  input(data, wasUserInput = true) {
    this._core.input(data, wasUserInput);
  }
  resize(columns, rows) {
    this._verifyIntegers(columns, rows);
    this._core.resize(columns, rows);
  }
  registerMarker(cursorYOffset = 0) {
    this._verifyIntegers(cursorYOffset);
    return this._core.registerMarker(cursorYOffset);
  }
  addMarker(cursorYOffset) {
    return this.registerMarker(cursorYOffset);
  }
  dispose() {
    super.dispose();
  }
  scrollLines(amount) {
    this._verifyIntegers(amount);
    this._core.scrollLines(amount);
  }
  scrollPages(pageCount) {
    this._verifyIntegers(pageCount);
    this._core.scrollPages(pageCount);
  }
  scrollToTop() {
    this._core.scrollToTop();
  }
  scrollToBottom() {
    this._core.scrollToBottom();
  }
  scrollToLine(line) {
    this._verifyIntegers(line);
    this._core.scrollToLine(line);
  }
  clear() {
    this._core.clear();
  }
  write(data, callback) {
    this._core.write(data, callback);
  }
  writeln(data, callback) {
    this._core.write(data);
    this._core.write("\r\n", callback);
  }
  reset() {
    this._core.reset();
  }
  loadAddon(addon) {
    this._addonManager.loadAddon(this, addon);
  }
  _verifyIntegers(...values) {
    for (const value of values) {
      if (value === Infinity || isNaN(value) || value % 1 !== 0) {
        throw new Error("This API only accepts integers");
      }
    }
  }
};
export {
  Terminal2 as Terminal
};
/**
 * Copyright (c) 2019 The xterm.js authors. All rights reserved.
 * @license MIT
 */
/**
 * Copyright (c) 2018 The xterm.js authors. All rights reserved.
 * @license MIT
 */
/**
 * Copyright (c) 2021 The xterm.js authors. All rights reserved.
 * @license MIT
 */
/**
 * Copyright (c) 2024-2026 The xterm.js authors. All rights reserved.
 * @license MIT
 *
 * Minimal lifecycle utilities for xterm.js core.
 * Simplified from VS Code's lifecycle.ts - no tracking/leak detection.
 */
/**
 * Copyright (c) 2024-2026 The xterm.js authors. All rights reserved.
 * @license MIT
 *
 * Minimal event utilities for xterm.js core.
 * Simplified from VS Code's event.ts - no leak detection/profiling.
 */
/**
 * Copyright (c) 2026 The xterm.js authors. All rights reserved.
 * @license MIT
 */
/**
 * Copyright (c) 2019 The xterm.js authors. All rights reserved.
 * @license MIT
 *
 * This was heavily inspired from microsoft/vscode's dependency injection system (MIT).
 */
/**
 * Copyright (c) 2016 The xterm.js authors. All rights reserved.
 * @license MIT
 */
/**
 * Copyright (c) 2022 The xterm.js authors. All rights reserved.
 * @license MIT
 */
/**
 * Copyright (c) 2026 The xterm.js authors. All rights reserved.
 * @license MIT
 *
 * Minimal async helpers for xterm.js core.
 */
/**
 * Copyright (c) 2017 The xterm.js authors. All rights reserved.
 * @license MIT
 */
/**
 * Copyright (c) 2025 The xterm.js authors. All rights reserved.
 * @license MIT
 */
/**
 * Copyright (c) 2014 The xterm.js authors. All rights reserved.
 * Copyright (c) 2012-2013, Christopher Jeffrey (MIT License)
 * @license MIT
 */
/**
 * Copyright (c) 2014-2020 The xterm.js authors. All rights reserved.
 * Copyright (c) 2012-2013, Christopher Jeffrey (MIT License)
 * @license MIT
 *
 * Originally forked from (with the author's permission):
 *   Fabrice Bellard's javascript vt100 for jslinux:
 *   http://bellard.org/jslinux/
 *   Copyright (c) 2011 Fabrice Bellard
 *   The original design remains. The terminal itself
 *   has been extended to include xterm CSI codes, among
 *   other features.
 *
 * Terminal Emulation References:
 *   http://vt100.net/
 *   http://invisible-island.net/xterm/ctlseqs/ctlseqs.txt
 *   http://invisible-island.net/xterm/ctlseqs/ctlseqs.html
 *   http://invisible-island.net/vttest/
 *   http://www.inwap.com/pdp10/ansicode.txt
 *   http://linux.die.net/man/4/console_codes
 *   http://linux.die.net/man/7/urxvt
 */
/**
 * Copyright (c) 2014 The xterm.js authors. All rights reserved.
 * Copyright (c) 2012-2013, Christopher Jeffrey (MIT License)
 * @license MIT
 *
 * Originally forked from (with the author's permission):
 *   Fabrice Bellard's javascript vt100 for jslinux:
 *   http://bellard.org/jslinux/
 *   Copyright (c) 2011 Fabrice Bellard
 *   The original design remains. The terminal itself
 *   has been extended to include xterm CSI codes, among
 *   other features.
 *
 * Terminal Emulation References:
 *   http://vt100.net/
 *   http://invisible-island.net/xterm/ctlseqs/ctlseqs.txt
 *   http://invisible-island.net/xterm/ctlseqs/ctlseqs.html
 *   http://invisible-island.net/vttest/
 *   http://www.inwap.com/pdp10/ansicode.txt
 *   http://linux.die.net/man/4/console_codes
 *   http://linux.die.net/man/7/urxvt
 */
