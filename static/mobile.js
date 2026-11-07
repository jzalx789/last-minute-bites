/* Locally bundled QR decoding; frames stay on this device. No image upload. */
(() => {
  "use strict";
  let stream = null,
    timer = null,
    generation = 0,
    installPrompt = null;
  const el = (id) => document.getElementById(id);
  const zh = () => document.documentElement.lang === "zh-Hant";
  const message = (en, cn) => (zh() ? cn : en);
  const status = (text) => {
    if (el("scanner-status")) el("scanner-status").textContent = text;
  };
  function stop() {
    generation++;
    clearTimeout(timer);
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    if (el("qr-video")) el("qr-video").srcObject = null;
  }
  function acceptCode(value) {
    const match = /^lmb-invite:([A-Za-z0-9_-]{32})$/.exec(value);
    if (!match) return false;
    const input = document.querySelector('[name="code"]');
    if (!input) return false;
    input.value = match[1];
    input.dispatchEvent(new Event("input", { bubbles: true }));
    stop();
    el("scanner").close();
    input.focus();
    const hint = document.createElement("p");
    hint.className = "hint scan-success";
    hint.setAttribute("role", "status");
    hint.textContent = message(
      "Code scanned. Preview the invitation before joining.",
      "已掃描邀請碼。請先預覽邀請，再確認加入。",
    );
    input.closest("form").append(hint);
    return true;
  }
  async function start() {
    stop();
    if (!el("scanner").open) el("scanner").showModal();
    status(
      message(
        "Allow camera access to scan an invitation. Frames stay on your device.",
        "請允許相機存取以掃描邀請碼；畫面只在裝置內處理。",
      ),
    );
    if (!navigator.mediaDevices?.getUserMedia) {
      status(
        message(
          "Camera requires HTTPS and a supported browser. You can enter the code manually.",
          "相機需要 HTTPS 及支援的瀏覽器。你仍可手動輸入邀請碼。",
        ),
      );
      return;
    }
    const run = generation;
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 640 } },
        audio: false,
      });
      if (run !== generation || !el("scanner").open) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = media;
      const video = el("qr-video");
      video.srcObject = media;
      await video.play();
      status(
        message(
          "Point the camera at a Last Minute Bites invitation QR code.",
          "請將相機對準 Last Minute Bites 邀請 QR Code。",
        ),
      );
      const canvas = document.createElement("canvas"),
        context = canvas.getContext("2d", { willReadFrequently: true });
      function scan() {
        if (run !== generation || !stream || !el("scanner").open) return;
        if (video.readyState >= 2 && video.videoWidth) {
          const ratio = Math.min(1, 640 / video.videoWidth);
          canvas.width = Math.round(video.videoWidth * ratio);
          canvas.height = Math.round(video.videoHeight * ratio);
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const pixels = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );
          const code = window.jsQR(pixels.data, canvas.width, canvas.height, {
            inversionAttempts: "dontInvert",
          });
          if (code) {
            if (acceptCode(code.data)) return;
            status(
              message(
                "This is not a Last Minute Bites invitation. Scan its invitation QR code instead.",
                "此 QR Code 並非本 App 邀請。請掃描冰箱的邀請 QR Code。",
              ),
            );
          }
        }
        timer = setTimeout(scan, 200);
      }
      scan();
    } catch (error) {
      stop();
      const denied = ["NotAllowedError", "PermissionDeniedError"].includes(
        error.name,
      );
      status(
        denied
          ? message(
              "Camera access was denied. Close this scanner and type the invitation code, or change browser permissions and retry.",
              "相機權限已被拒絕。關閉後可手動輸入邀請碼，或更改瀏覽器權限後重試。",
            )
          : message(
              "Camera unavailable. Close this scanner and type the code, or retry with another camera.",
              "相機暫時無法使用。關閉後可手動輸入邀請碼，或換相機重試。",
            ),
      );
    }
  }
  function drawCode(code, container) {
    const qr = window.qrcode(0, "M");
    qr.addData("lmb-invite:" + code);
    qr.make();
    const canvas = document.createElement("canvas"),
      scale = 6,
      count = qr.getModuleCount(),
      margin = 4;
    canvas.width = canvas.height = (count + 2 * margin) * scale;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#173e2c";
    for (let row = 0; row < count; row++)
      for (let col = 0; col < count; col++)
        if (qr.isDark(row, col))
          context.fillRect(
            (col + margin) * scale,
            (row + margin) * scale,
            scale,
            scale,
          );
    const image = document.createElement("img");
    image.src = canvas.toDataURL("image/png");
    image.width = 220;
    image.height = 220;
    image.className = "invite-qr";
    image.alt = message(
      "Invitation QR code. Only share with people you want to invite.",
      "邀請 QR Code，只應分享予你希望邀請的人。",
    );
    container.append(image);
  }
  window.LMBMobile = {
    startScanner: start,
    stopScanner: stop,
    drawCode,
    async install() {
      if (installPrompt) {
        await installPrompt.prompt();
        await installPrompt.userChoice;
        installPrompt = null;
      } else {
        const box = el("install-guide");
        if (box) box.hidden = false;
      }
    },
  };
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
  });
  document.addEventListener("DOMContentLoaded", () => {
    el("scanner").addEventListener("close", stop);
    el("scanner-close").addEventListener("click", () => el("scanner").close());
    el("scanner-retry").addEventListener("click", start);
  });
  window.addEventListener("hashchange", () => {
    stop();
    if (el("scanner")?.open) el("scanner").close();
  });
  window.addEventListener("pagehide", stop);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
      if (el("scanner")?.open) el("scanner").close();
    }
  });
  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () =>
      navigator.serviceWorker.register("/sw.js").catch(() => {}),
    );
  }
})();
