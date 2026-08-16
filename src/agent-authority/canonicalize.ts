/** RFC 8785 JSON Canonicalization Scheme using ECMAScript JSON serialization. */
export function canonicalize(value: unknown): string {
  return serialize(value, new Set<object>());
}

function serialize(value: unknown, ancestors: Set<object>): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("JCS forbids non-finite numbers");
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
    const object = value as Record<string, unknown>;
    const keys = Object.keys(object).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${serialize(object[key], ancestors)}`).join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}
