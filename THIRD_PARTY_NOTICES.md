# Locally bundled components

QR-scanner camera frames stay on the device and are not uploaded. The separate photo-recognition feature sends a reduced image to the AI service only after explicit consent. No runtime CDN is used for these QR libraries; they are bundled under static/vendor, with upstream copyright/license notices retained.

| Component | Version | License | Source |
| --- | --- | --- | --- |
| jsQR | 1.4.0 | Apache-2.0 | https://www.npmjs.com/package/jsqr/v/1.4.0 |
| qrcode-generator | 2.0.4 | MIT, Copyright (c) 2009 Kazuhiko Arase | https://www.npmjs.com/package/qrcode-generator/v/2.0.4 |

The qrcode-generator distribution embeds its copyright and MIT license reference in its JavaScript header. jsQR's complete license is in static/vendor/jsqr-LICENSE.txt. Vendored bytes are unmodified.
