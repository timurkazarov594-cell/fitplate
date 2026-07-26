import path from "node:path";
import { fileURLToPath } from "node:url";
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// Built client bundle (see artifacts/nutrition-coach), served by this same
// process since Render runs a single web service per app.
const clientDist = path.resolve(
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

app.use(express.static(clientDist));
app.get("*splat", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// Terminal error handler: never leak stack traces or raw SQL to clients.
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  req.log.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Внутренняя ошибка сервера." });
});

export default app;
