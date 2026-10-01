import { defineModule } from "@orbis/sdk/server";

type Settings = { greeting?: string };

/**
 * Server side of the module. Runs inside the Orbis hub.
 *  - ctx.http      hono router mounted at /api/m/<id>  (requests are authenticated already)
 *  - ctx.storage   key/value store + your own sqlite tables ({{t:name}} is prefixed per module)
 *  - ctx.events    publish(name, payload) → every connected client (useModuleEvents / useModuleQuery refetchOn)
 *  - ctx.scheduler every / once / cancel
 *  - ctx.settings  module settings from module.json → settingsSchema
 *  - ctx.devices   devices the hub found on the network (list / suggested / claim)
 *  - ctx.fetch     outgoing http
 */
export default defineModule<Settings>({
  setup(ctx) {
    const { http, storage, events, settings } = ctx;

    http.get("/counter", (c) => c.json({ value: storage.get<number>("counter") ?? 0, greeting: settings.get().greeting ?? "hello" }));

    http.post("/counter", async (c) => {
      const body = (await c.req.json().catch(() => ({}))) as { step?: number };
      const next = (storage.get<number>("counter") ?? 0) + (Number(body.step) || 1);
      storage.set("counter", next);
      events.publish("counter", { value: next });
      return c.json({ value: next });
    });

    http.delete("/counter", (c) => {
      storage.set("counter", 0);
      events.publish("counter", { value: 0 });
      return c.json({ value: 0 });
    });

    ctx.logger.info("my-module ready");
  },
  teardown() {
    // close connections, clear timers you created outside ctx.scheduler
  },
});
