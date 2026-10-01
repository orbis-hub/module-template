import { useState } from "react";
import { defineClient, useModuleApi, useModuleQuery, useModuleSettings, type PageProps, type WidgetProps } from "@orbis/sdk/client";
import { Button, Icon, Window } from "@orbis/ui";

/**
 * Client side of the module. Rendered inside the Orbis web app.
 * react, react-dom, @orbis/sdk/client and @orbis/ui are provided by the host at runtime (not bundled).
 */

type CounterConfig = { label?: string; step?: number };
type CounterData = { value: number; greeting: string };

function CounterWidget({ config, size }: WidgetProps<CounterConfig>) {
  const api = useModuleApi();
  // fetches /api/m/<id>/counter and refetches whenever the server publishes "counter"
  const q = useModuleQuery<CounterData>("/counter", { refetchOn: ["counter"] });
  const [busy, setBusy] = useState(false);
  const big = Math.max(20, Math.min(size.height * 0.4, size.width / 4));
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <div className="soft" style={{ fontSize: 11 }}>{q.data?.greeting ?? "…"} · {config.label ?? "clicks"}</div>
      <div className="pixel" style={{ fontSize: big, lineHeight: 1 }}>{q.data?.value ?? "–"}</div>
      <Button
        size="sm"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api("/counter", { method: "POST", json: { step: config.step ?? 1 } });
          } finally {
            setBusy(false);
          }
        }}
      >
        <Icon name="plus" size={12} /> +{config.step ?? 1}
      </Button>
    </div>
  );
}

function MainPage(_props: PageProps) {
  const api = useModuleApi();
  const q = useModuleQuery<CounterData>("/counter", { refetchOn: ["counter"] });
  const [settings] = useModuleSettings<{ greeting?: string }>();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
      <Window title="counter">
        <p style={{ fontSize: 13 }}>
          the counter is <b className="pixel">{q.data?.value ?? "–"}</b>. it lives on the hub, so every device sees the same number.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Button onClick={() => api("/counter", { method: "POST", json: { step: 1 } })}>+1</Button>
          <Button variant="danger" onClick={() => api("/counter", { method: "DELETE" })}>reset</Button>
        </div>
      </Window>
      <Window title="settings" dashed>
        <p className="soft" style={{ fontSize: 12 }}>
          greeting from module settings: <b>{settings.greeting ?? "hello"}</b>. change it under modules → settings.
        </p>
      </Window>
    </div>
  );
}

export default defineClient({
  widgets: { counter: CounterWidget },
  pages: { main: MainPage },
  // settings: CustomSettingsComponent  ← optional, otherwise a form is generated from settingsSchema
});
