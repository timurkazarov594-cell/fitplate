import fs from "fs";

const file = "artifacts/api-server/public/index.html";

if (!fs.existsSync(file)) {
  console.error("index.html not found:", file);
  process.exit(1);
}

let html = fs.readFileSync(file, "utf8");

const patch = `
<script id="fitplate-storage-patch">
(function () {
  try {
    for (var i = localStorage.length - 1; i >= 0; i--) {
      var key = localStorage.key(i);
      var value = localStorage.getItem(key);
      if (
        value === "undefined" ||
        value === undefined ||
        value === "null" ||
        value === ""
      ) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {}

  try {
    var originalParse = JSON.parse;
    JSON.parse = function (value, reviver) {
      if (
        value === undefined ||
        value === "undefined" ||
        value === null ||
        value === ""
      ) {
        return null;
      }
      return originalParse.call(JSON, value, reviver);
    };
  } catch (e) {}
})();
</script>
`;

if (!html.includes("fitplate-storage-patch")) {
  html = html.replace("<head>", "<head>" + patch);
  fs.writeFileSync(file, html);
  console.log("FitPlate startup patch injected");
} else {
  console.log("FitPlate startup patch already exists");
}
