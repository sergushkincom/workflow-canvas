// Resolve hook for `npm test`. Node loads these `.ts` files, but the
// modules import each other without extensions and the app imports them
// through the `@/` alias in tsconfig. No extra test dependency.
import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs"];

function isFile(filePath) {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function resolveFile(basePath) {
  if (isFile(basePath)) {
    return basePath;
  }
  for (const extension of EXTENSIONS) {
    const candidate = basePath + extension;
    if (isFile(candidate)) {
      return candidate;
    }
  }
  for (const extension of EXTENSIONS) {
    const candidate = path.join(basePath, `index${extension}`);
    if (isFile(candidate)) {
      return candidate;
    }
  }
  return null;
}

function projectFile(specifier, parentURL) {
  if (specifier.startsWith("@/")) {
    return path.join(ROOT, specifier.slice(2));
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parentDir = parentURL
      ? path.dirname(fileURLToPath(parentURL))
      : ROOT;
    return path.resolve(parentDir, specifier);
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  const base = projectFile(specifier, context.parentURL);
  if (base) {
    const file = resolveFile(base);
    if (file) {
      return {
        shortCircuit: true,
        url: pathToFileURL(file).href,
      };
    }
  }
  return nextResolve(specifier, context);
}
