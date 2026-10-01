<p align="center"><img src="https://raw.githubusercontent.com/orbis-hub/orbis/main/brand/logo-dark.svg" alt="" width="64"></p>

# orbis module template

a complete, working [orbis](https://github.com/orbis-hub/orbis) module: one widget (a hub-side counter that syncs to every client), one page, module settings. copy it, rename it, replace the counter with your thing.

## use this template

1. click **use this template** on github (or clone it).
2. edit `module.json`: set `id` (lowercase, dashes), `name`, `description`, `repo`, `icon`.
3. `pnpm install`

## develop

```bash
pnpm dev            # = orbis-module watch --dev=../orbis/apps/hub/data
```

`--dev=<hub data dir>` mirrors the module into `<data>/modules-dev/<id>/`; a running hub picks up every rebuild without restarting. point it at your hub's data directory (locally `apps/hub/data`, in docker the mounted `./data`). open the app, add the widget from **+ widget**.

```bash
pnpm typecheck      # tsc over src/
pnpm build          # production bundles → dist/
pnpm pack:module           # → module.tgz (module.json + dist/ + README)
```

## release

tag a version and push: the included workflow builds `module.tgz` and attaches it to a github release. the hub installs from `https://github.com/<repo>/releases/download/v<version>/module.tgz`.

```bash
git tag v0.1.0 && git push --tags
```

then open a pr against [orbis-hub/registry](https://github.com/orbis-hub/registry) adding your module to `index.json`, and it shows up in everyone's store.

## layout

```
module.json        manifest (widgets, pages, settingsSchema, permissions, discovery)
src/server.ts      runs inside the hub   → ctx.http / storage / events / scheduler / devices / settings
src/client.tsx     runs in the browser   → widgets, pages, optional custom settings ui
dist/              build output (gitignored)
```

### server (`@orbis/sdk/server`)

`defineModule({ setup(ctx), teardown?() })`. `ctx.http` is a hono router at `/api/m/<id>` (already authenticated). `ctx.storage.get/set` is a kv store; `ctx.storage.sql("CREATE TABLE IF NOT EXISTS {{t:items}} (...)")` gives you your own sqlite tables. `ctx.events.publish("name", payload)` pushes to clients. `ctx.scheduler.every("job", ms, fn)` for polling. `ctx.devices.suggested()` lists unclaimed network devices that match your manifest's `discovery` matcher.

### client (`@orbis/sdk/client`)

`defineClient({ widgets, pages, settings?, widgetConfig? })`. widgets receive `{ instance, config, size, editing }`. hooks: `useModuleApi()`, `useModuleQuery(path, { refetchOn, intervalMs })`, `useModuleEvents(name, cb)`, `useModuleSettings()`, `useModuleDevices()`. ui components come from `@orbis/ui` (`Window`, `Button`, `Icon`, `Input`, `Chip`, …) and match the app's look. icons too: `<Icon name="calendar" />` (190+ pixelarticons, `iconNames()` lists them) and `<WeatherIcon name="rain" />` plus `describeWmo(code, isDay)` for weather codes. they are provided by the host, so they cost your bundle nothing.

react, react-dom, `@orbis/sdk/client` and `@orbis/ui` are **not bundled**: the host provides them at runtime, so there is one react instance and your bundle stays small.

## notes

- never trust input from the browser in `server.ts`; validate request bodies.
- declare what you need in `permissions` (shown to the user before install): `network:fetch`, `storage`, `scheduler`, `devices:read`, `devices:claim`, `settings:read`, `notifications`, `network:scan`.
- `minHub` is the oldest hub version your module supports.
