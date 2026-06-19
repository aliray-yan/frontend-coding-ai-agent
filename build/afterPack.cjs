const fs = require("node:fs");
const path = require("node:path");
const { rcedit } = require("rcedit");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;

  const productFilename = context.packager.appInfo.productFilename;
  const exePath = path.join(context.appOutDir, `${productFilename}.exe`);
  const iconPath = path.join(context.packager.projectDir, "build", "icon.ico");

  if (!fs.existsSync(exePath) || !fs.existsSync(iconPath)) return;

  await rcedit(exePath, {
    icon: iconPath,
    "file-version": context.packager.appInfo.version,
    "product-version": context.packager.appInfo.version,
    "version-string": {
      CompanyName: "Local",
      FileDescription: "Frontend Coding AI Agent",
      ProductName: "Frontend Coding AI Agent",
      OriginalFilename: `${productFilename}.exe`,
      InternalName: "Frontend Coding AI Agent"
    }
  });
};
