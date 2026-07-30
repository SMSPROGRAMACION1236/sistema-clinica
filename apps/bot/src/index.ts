import express from "express";
import { env } from "./lib/env";
import { webhookRouter } from "./webhook";
import { startReminderCron } from "./cron/reminders";
import { startFollowUpCron } from "./cron/followups";

const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as unknown as { rawBody: string }).rawBody = buf.toString("utf8");
    },
  })
);

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(webhookRouter);

app.listen(env.port, () => {
  console.log(`[bot] escuchando en el puerto ${env.port}`);
  startReminderCron();
  startFollowUpCron();
});
