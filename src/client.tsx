import { useState } from "react";
import { defineClient, useModule, useModuleApi, useModuleQuery, useT, type PageProps, type WidgetProps } from "@orbis/sdk/client";
import { Button, Empty, Icon, Modal, useToast, Window } from "@orbis/ui";

/**
 * Client side of the module. Rendered inside the Orbis web app.
 * react, react-dom, @orbis/sdk/client and @orbis/ui are provided by the host at runtime (not bundled).
 *
 * - every visible string goes through useT() → locales/<lang>.json (english is the fallback)
 * - numbers and dates use useModule().locale / .timezone, the hub's formatting settings
 * - sizes and colours come from the design tokens (--fs-meta, --accent-ink …) so contrast stays readable
 * - widgets get their pixel size: switch to a compact layout instead of overflowing the frame
 */

type CounterConfig = { label?: string; step?: number };
type CounterData = { value: number; greeting: string; milestone: number; hubName: string };

/** api() throws an Error with .status for non-2xx answers */
const statusOf = (err: unknown) => (err as { status?: number }).status;

function useCounter() {
  // fetches /api/m/<id>/counter and refetches whenever the server publishes "counter"
  return useModuleQuery<CounterData>("/counter", { refetchOn: ["counter"] });
}

function CounterWidget({ config, size }: WidgetProps<CounterConfig>) {
  const t = useT();
  const { locale } = useModule();
  const api = useModuleApi();
  const toast = useToast();
  const q = useCounter();
  const [busy, setBusy] = useState(false);
  const step = config.step ?? 1;
  const label = config.label || t("counter.defaultLabel");

  // the frame measures after the first paint; 0×0 means "assume the default size"
  const w = size.width || 230;
  const h = size.height || 70;
  const compact = h < 90 || w < 170;
  const big = Math.max(18, Math.min(compact ? h * 0.55 : h * 0.4, w / 4));

  if (q.error) return <Empty icon="sparkles" title={t("error.load")} />;

  const add = async () => {
    setBusy(true);
    try {
      await api("/counter", { method: "POST", json: { step } });
    } catch {
      toast(t("error.save"), "bad");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ height: "100%", minWidth: 0, display: "flex", flexDirection: compact ? "row" : "column", alignItems: "center", justifyContent: "center", gap: compact ? 10 : 6 }}>
      {compact ? null : (
        <div className="soft" style={{ fontSize: "var(--fs-meta)", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`${q.data?.greeting ?? ""} · ${label}`}>
          {q.data?.greeting ?? t("counter.loading")} · {label}
        </div>
      )}
      <div className="pixel" style={{ fontSize: big, lineHeight: 1 }} aria-live="polite" title={compact ? label : undefined}>
        {q.data ? new Intl.NumberFormat(locale).format(q.data.value) : "–"}
      </div>
      <Button size="sm" loading={busy} onClick={add} aria-label={t("counter.add", { step })}>
        <Icon name="plus" size={12} />
        {compact ? null : <span>{step}</span>}
      </Button>
    </div>
  );
}

function MainPage(_props: PageProps) {
  const t = useT();
  const { locale } = useModule();
  const api = useModuleApi();
  const toast = useToast();
  const q = useCounter();
  const [confirmReset, setConfirmReset] = useState(false);
  const value = q.data ? new Intl.NumberFormat(locale).format(q.data.value) : "–";

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err) {
      toast(statusOf(err) === 403 ? t("error.adminOnly") : t("error.save"), "bad");
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, alignItems: "start" }}>
      <Window title={t("page.counter.title")}>
        <p style={{ fontSize: "var(--fs-ui)" }}>{t("page.counter.text", { value })}</p>
        {q.data ? (
          <p className="soft" style={{ fontSize: "var(--fs-meta)", marginTop: 6 }}>
            {t("page.counter.hub", { hub: q.data.hubName })}
          </p>
        ) : null}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Button variant="primary" onClick={() => run(() => api("/counter", { method: "POST", json: { step: 1 } }))}>
            {t("page.add")}
          </Button>
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            {t("page.reset")}
          </Button>
        </div>
      </Window>

      <Window title={t("page.settings.title")} dashed>
        <p className="soft" style={{ fontSize: "var(--fs-meta)" }}>
          {t("page.settings.greeting", { greeting: q.data?.greeting ?? "…" })}
        </p>
        {q.data ? (
          <p className="soft" style={{ fontSize: "var(--fs-meta)", marginTop: 6 }}>
            {t("page.settings.milestone", { count: q.data.milestone })}
          </p>
        ) : null}
      </Window>

      {/* never use confirm()/prompt(): Modal is accessible (focus trap, escape) and looks like the app */}
      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title={t("reset.title")} closeLabel={t("reset.cancel")}>
        <p style={{ fontSize: "var(--fs-ui)" }}>{t("reset.body")}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <Button onClick={() => setConfirmReset(false)}>{t("reset.cancel")}</Button>
          <Button
            variant="danger"
            onClick={async () => {
              setConfirmReset(false);
              await run(() => api("/counter", { method: "DELETE" }));
            }}
          >
            {t("reset.confirm")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default defineClient({
  widgets: { counter: CounterWidget },
  pages: { main: MainPage },
  // settings: CustomSettingsComponent  ← optional, otherwise a form is generated from settingsSchema
});
