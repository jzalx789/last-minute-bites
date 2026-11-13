export const APP_VERSION = "1.4.2";

// Old app shells have no agreement UI or translation. Give those clients the
// update message they already understand, while keeping the server guard intact.
export function clientErrorCode(code, request) {
  return code === "agreement_required" && !request.headers.get("X-LMB-Client-Version")
    ? "upgrade_required"
    : code;
}
