/* Push permission is requested only by a deliberate Enable button click. */
(() => {
  "use strict";
  const fail = (code) => {
    throw { code };
  };
  const ios = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = () =>
    matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true;
  const capability = () =>
    ios() && !standalone()
      ? "push_install_first"
      : !isSecureContext ||
          !("Notification" in window) ||
          !("PushManager" in window) ||
          !("serviceWorker" in navigator)
        ? "push_unsupported"
        : null;
  const decode = (s) =>
    Uint8Array.from(
      atob(
        s.replace(/-/g, "+").replace(/_/g, "/") +
          "=".repeat((4 - (s.length % 4)) % 4),
      ),
      (c) => c.charCodeAt(0),
    );
  async function registration() {
    let r = await navigator.serviceWorker.getRegistration("/");
    if (!r) r = await navigator.serviceWorker.register("/sw.js");
    return navigator.serviceWorker.ready;
  }
  window.LMBPush = {
    capability,
    async status(api) {
      const reason = capability();
      if (reason)
        return { reason, permission: "unsupported", subscribed: false };
      const config = await api("push/config");
      const r = await registration(),
        sub = await r.pushManager.getSubscription();
      const status = sub
        ? await api("push/status", { endpoint: sub.endpoint })
        : { subscribed: false };
      return {
        ...status,
        permission: Notification.permission,
        schedule: config.schedule,
        provider: config.provider,
      };
    },
    async enable(api) {
      const reason = capability();
      if (reason) fail(reason);
      // Safari requires this call before any await consumes the click activation.
      const asking =
        Notification.permission === "default"
          ? Notification.requestPermission()
          : Promise.resolve(Notification.permission);
      const permission = await asking;
      if (permission !== "granted")
        fail(
          permission === "denied" ? "push_denied" : "push_permission_needed",
        );
      const config = await api("push/config"),
        r = await registration();
      let sub = await r.pushManager.getSubscription();
      if (sub) {
        const saved = await api("push/status", { endpoint: sub.endpoint });
        if (!saved.subscribed) {
          await sub.unsubscribe();
          sub = null;
        }
      }
      try {
        if (!sub)
          sub = await r.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: decode(config.publicKey),
          });
      } catch {
        fail("push_unavailable");
      }
      await api("push/subscribe", { subscription: sub.toJSON() });
      return this.status(api);
    },
    async disable(api) {
      let sub = null;
      if ("serviceWorker" in navigator) {
        const r = await navigator.serviceWorker.getRegistration("/");
        if (r && "pushManager" in r)
          sub = await r.pushManager.getSubscription();
      }
      // Delete the server subscription first so disable is effective even offline from the push service.
      await api("push/unsubscribe", sub ? { endpoint: sub.endpoint } : {});
      if (sub) await sub.unsubscribe().catch(() => {});
      return {
        subscribed: false,
        permission:
          "Notification" in window ? Notification.permission : "unsupported",
      };
    },
    async test(api) {
      if (capability()) fail(capability());
      if (Notification.permission !== "granted") fail("push_permission_needed");
      const r = await registration(),
        sub = await r.pushManager.getSubscription();
      if (!sub) fail("push_not_subscribed");
      return api("push/test", { endpoint: sub.endpoint });
    },
  };
})();
