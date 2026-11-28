import {
  LINK_COPY_FAILED,
  LINK_COPIED,
  LINK_IN_ADDRESS_BAR,
  LINK_TOO_LONG,
  shareLinkFor,
  type CanvasSnapshot,
} from "@/lib/experiments/workflow-canvas/canvas-link";

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // The page can still show the link in the address bar.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  } catch {
    return false;
  }
}

/** Puts the compressed canvas on the clipboard and into the address bar. */
export async function copyCanvasLink(
  pageUrl: string,
  snapshot: CanvasSnapshot | null,
): Promise<string> {
  if (!snapshot) {
    return LINK_COPY_FAILED;
  }
  const link = shareLinkFor(pageUrl, snapshot);
  if (!link.ok) {
    return link.reason === "too-long" ? LINK_TOO_LONG : LINK_COPY_FAILED;
  }
  const next = new URL(link.url);
  window.history.replaceState(
    null,
    "",
    `${next.pathname}${next.search}${next.hash}`,
  );
  const copied = await writeClipboard(link.url);
  return copied ? LINK_COPIED : LINK_IN_ADDRESS_BAR;
}
