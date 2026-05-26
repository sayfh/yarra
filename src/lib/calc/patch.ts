import type { Deal } from "../types";

/**
 * Apply a dot-path assumption update to a Deal, returning a new Deal.
 * Example paths: "rental.capRate", "hard.constructionPerSF", "units.fourBed.count".
 * Only leaf scalars (number, string) are settable.
 */
export function applyPatch(deal: Deal, path: string, value: number | string): Deal {
  const parts = path.split(".");
  if (parts.length === 0) throw new Error("Empty path");
  const next: any = structuredClone(deal);
  let cursor: any = next;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (cursor[k] === undefined || cursor[k] === null) {
      throw new Error(`Path not found: ${parts.slice(0, i + 1).join(".")}`);
    }
    cursor = cursor[k];
  }
  const leaf = parts[parts.length - 1];
  if (!(leaf in cursor)) {
    throw new Error(`Path not found: ${path}`);
  }
  const prev = cursor[leaf];
  if (typeof prev === "object" && prev !== null) {
    throw new Error(`Path "${path}" refers to an object — set its leaf fields instead.`);
  }
  cursor[leaf] = value;
  return next as Deal;
}

export function applyPatches(deal: Deal, patches: Array<{ path: string; value: number | string }>): Deal {
  let out = deal;
  for (const p of patches) out = applyPatch(out, p.path, p.value);
  return out;
}
