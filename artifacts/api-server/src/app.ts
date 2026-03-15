import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve(__dirname, "../../uploads")));
app.use("/api", router);

// Global error-handling middleware — prevents leaking stack traces to clients
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
