import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// Built client bundles (see artifacts/recipe-scanner and artifacts/nutrition-coach),
// served by this same process since Render runs a single web service per app.
const recipeScannerDist = path.resolve(
  currentDir,
  "../../recipe-scanner/dist/public",
);
const nutritionCoachDist = path.resolve(
  currentDir,
  "../../nutrition-coach/dist/public",
);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use("/api", router);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use("/nutrition-coach", express.static(nutritionCoachDist));
app.get("/nutrition-coach/*splat", (_req, res) => {
  res.sendFile(path.join(nutritionCoachDist, "index.html"));
});

app.use(express.static(recipeScannerDist));
app.get("*splat", (_req, res) => {
  res.sendFile(path.join(recipeScannerDist, "index.html"));
});

export default app;
