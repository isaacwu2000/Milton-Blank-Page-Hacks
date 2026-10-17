import { validateTool, type ToolConfig } from "../../../../../shared";
/** Decode and validate the private builder preview before rendering. */
export function readPreviewConfig(encoded: string): ToolConfig {
  return validateTool(
    JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(encoded.replaceAll("-", "+").replaceAll("_", "/")),
          (c) => c.charCodeAt(0),
        ),
      ),
    ),
  );
}
