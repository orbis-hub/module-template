import { defineModule, intRange, parseBody, z, type ModuleServerContext } from "@orbis/sdk/server";
import { crossedMilestone, nextValue, STEP_MAX } from "./logic";

type Settings = { greeting?: string; milestone?: number; apiToken?: string };
type Ctx = ModuleServerContext<Settings>;

/**
 * Server side of the module. Runs inside the Orbis hub (store modules in a worker thread).
 *  - ctx.http       hono router at /api/m/<id>; requests are authenticated, the caller is in the
 *                   x-orbis-user / x-orbis-role headers (set by the hub, clients cannot forge them)
 *  - ctx.storage    key/value store + your own sqlite tables ({{t:name}} is prefixed per module)
 *  - ctx.events     publish(name, payload) → every client (useModuleQuery refetchOn / useModuleEvents)
 *  - ctx.settings   module settings (settingsSchema, validated by the hub; "format": "secret" keys are admin-only)
 *  - ctx.hub        hub.settings(): name, language, locale, timezone, units, location (needs "settings:read")
 *  - ctx.i18n       t(key, vars) from locales/<lang>.json in the hub's language
 *  - ctx.notify     bell in the app + ntfy/telegram (needs "notifications")
 *  - ctx.fetch      outgoing http: no lan/loopback unless you declare "network:lan", 5 MB cap, 20 s timeout
 * Validate every request body: parseBody + z come from the sdk, no zod dependency needed.
 */

const stepBody = z.object({ step: intRange(1, STEP_MAX).default(1) });

const read = (ctx: Ctx) => ctx.storage.get<number>("counter") ?? 0;

function increment(ctx: Ctx, step: number): number {
  const prev = read(ctx);
  const next = nextValue(prev, step);
  ctx.storage.set("counter", next);
  ctx.events.publish("counter", { value: next });
  const hit = crossedMilestone(prev, next, ctx.settings.get().milestone ?? 100);
  // key: a newer milestone replaces the previous notification instead of piling up
  if (hit !== null) ctx.notify({ key: "milestone", title: ctx.i18n.t("notify.milestone", { count: hit }), level: "info", icon: "trophy" });
  return next;
}

function reset(ctx: Ctx) {
  ctx.storage.set("counter", 0);
  ctx.events.publish("counter", { value: 0 });
  ctx.dismissNotification("milestone");
}

export default defineModule<Settings>({
  setup(ctx) {
    const { http } = ctx;

    http.get("/counter", (c) =>
      c.json({
        value: read(ctx),
        greeting: ctx.settings.get().greeting?.trim() || ctx.i18n.t("greeting.default"),
        milestone: ctx.settings.get().milestone ?? 100,
        hubName: ctx.hub.settings().hubName,
      }),
    );

    http.post("/counter", async (c) => {
      const body = await parseBody(c, stepBody);
      if (!body.ok) return body.res; // 400 { error: "invalid input", issues } or { error: "invalid json" }
      return c.json({ value: increment(ctx, body.data.step) });
    });

    // module data is shared by everyone on the hub; gate destructive actions on the caller's role
    http.delete("/counter", (c) => {
      const role = c.req.header("x-orbis-role");
      if (role !== "owner" && role !== "admin") return c.json({ error: "admins only" }, 403);
      reset(ctx);
      return c.json({ value: 0 });
    });

    ctx.logger.info("my-module ready");
  },

  teardown() {
    // close connections, clear timers you created outside ctx.scheduler
  },

  /** e-ink view: a small layout tree the hub rasterises for e-paper displays */
  eink(ctx, req) {
    const label = typeof req.config.label === "string" && req.config.label ? req.config.label : ctx.i18n.t("counter.defaultLabel");
    return {
      type: "col",
      grow: 1,
      align: "center",
      justify: "center",
      gap: 4,
      children: [
        { type: "text", text: label, size: 14, gray: 0.5 },
        { type: "text", text: new Intl.NumberFormat(req.locale).format(read(ctx)), size: Math.max(24, Math.min(96, Math.round(req.height * 0.45))), pixel: true, bold: true },
        { type: "text", text: ctx.i18n.t("eink.tap"), size: 12, gray: 0.5 },
      ],
    };
  },

  /** a tap on a touch display adds one */
  einkTap(ctx, req) {
    const step = typeof req.config.step === "number" ? Math.min(STEP_MAX, Math.max(1, Math.round(req.config.step))) : 1;
    increment(ctx, step);
    return { refresh: true, toast: ctx.i18n.t("eink.added") };
  },
});
