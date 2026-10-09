import {createHash} from "node:crypto";

export function canonicalize(value:unknown):string{
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(canonicalize).join(",")}]`;
  const record=value as Record<string,unknown>;
  return `{${Object.keys(record).sort().map((key)=>`${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
}

export function sha256(value:unknown):string{
  const input=typeof value==="string"?value:canonicalize(value);
  return `sha256:${createHash("sha256").update(input).digest("hex")}`;
}
