import { toast } from "@heroui/react";

export function notify(color, text) {
  if (color === "success") {
    toast.success(text);
    return;
  }
  if (color === "danger") {
    toast.danger(text);
    return;
  }
  if (color === "warning") {
    toast.warning(text);
    return;
  }
  toast.info(text);
}

function fallbackCopyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ok = fallbackCopyText(text);
      if (!ok) throw new Error("fallback copy failed");
    }
    notify("success", "地址已复制。");
  } catch {
    notify("danger", "复制失败，请手动复制。");
  }
}