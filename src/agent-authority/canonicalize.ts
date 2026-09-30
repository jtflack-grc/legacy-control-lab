/** RFC 8785 JSON Canonicalization Scheme using ECMAScript JSON serialization. */
export function canonicalize(value: unknown): string {
  return serialize(value, new Set<object>());
}

function serialize(value: unknown, ancestors: Set<object>): string {
  if (typeof value === "string") {
    assertValidUnicode(value, "string value");
    return JSON.stringify(value);
  }
  if (value === null || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("JCS forbids non-finite numbers");
    if (Object.is(value, -0)) throw new TypeError("JCS forbids negative zero");
    return JSON.stringify(value);
  }
  if (typeof value !== "object") throw new TypeError(`Value is not valid JSON: ${typeof value}`);
  if (ancestors.has(value)) throw new TypeError("JCS forbids cyclic values");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.keys(value).some((key) => !/^\d+$/.test(key) || Number(key) >= value.length)) {
        throw new TypeError("JCS arrays cannot have non-index properties");
      }
      const items = Array.from({ length: value.length }, (_, index) => {
        if (!Object.prototype.hasOwnProperty.call(value, index)) throw new TypeError("JCS forbids sparse arrays");
        return serialize(value[index], ancestors);
      });
      return `[${items.join(",")}]`;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("JCS accepts only plain JSON objects");
    }
    const object = value as Record<string, unknown>;
    const keys = Object.keys(object).sort();
    keys.forEach((key) => assertValidUnicode(key, "property name"));
    return `{${keys.map((key) => `${JSON.stringify(key)}:${serialize(object[key], ancestors)}`).join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

function assertValidUnicode(value: string, label: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new TypeError(`JCS forbids lone surrogate in ${label}`);
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      throw new TypeError(`JCS forbids lone surrogate in ${label}`);
    }
  }
}
