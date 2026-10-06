<p align="center"><img src="https://raw.githubusercontent.com/orbis-hub/orbis/main/brand/logo-dark.svg" alt="" width="64"></p>

# orbis module template

a complete, working [orbis](https://github.com/orbis-hub/orbis) module: one widget (a hub-side counter that syncs to every client), one page, module settings, english + german, an e-ink view. copy it, rename it, replace the counter with your thing. needs hub **0.2.0** or newer.

what it shows, in about 200 lines:

| file | what to look at |
| --- | --- |
| `src/server.ts` | routes on `ctx.http`, body validation with `parseBody` + `intRange`, an admin-only action via the `x-orbis-role` header, `ctx.hub.settings()`, a notification text from `ctx.i18n.t`, `eink()` + `einkTap()` |
| `src/client.tsx` | `useT()` for every string, number formatting with the hub `locale`, a compact layout for small widgets, design tokens (`--fs-meta`, …), a `Modal` instead of `confirm()`, error toasts |
| `src/logic.ts` + `logic.test.ts` | rules without sdk imports, unit-tested with vitest |
| `locales/en.json`, `locales/de.json` | translations, including the manifest texts (`manifest.name`, `widget.<id>.name`, `page.<id>.name`) |
| `module.json` | `languages`, a `"format": "secret"` setting, `permissions`, `minHub` |

## use this template

1. click **use this template** on github (or clone it).
2. edit `module.json`: set `id` (lowercase, dashes), `name`, `description`, `repo`, `icon` (a pixelarticons name).
3. mirror `name` / `description` / widget and page names in `locales/en.json` and `locales/de.json`.
4. `pnpm install`

## develop

```bash
pnpm dev            # = orbis-module watch --dev=../orbis/apps/hub/data
```

`--dev=<hub data dir>` mirrors the module into `<data>/modules-dev/<id>/`; a running hub picks up every rebuild without restarting. point it at your hub's data directory (locally `apps/hub/data`, in docker the mounted `./data`). open the app, add the widget from **+ widget**. locale files are copied when `pnpm dev` starts: restart it after editing `locales/`.

```bash
pnpm typecheck      # tsc over src/
pnpm test           # vitest
pnpm check:locales  # every language has every key, placeholders match english
pnpm build          # production bundles + dist/locales/ → dist/
pnpm pack:module    # → module.tgz (module.json + dist/ + README + LICENSE)
```

`ci.yml` runs typecheck, tests, the locale check and the build on every push and pull request.

## release

tag a version and push: `release.yml` checks, builds `module.tgz` and attaches it to a github release. the hub installs from `https://github.com/<repo>/releases/download/v<version>/module.tgz`.

```bash
git tag v0.1.0 && git push --tags
```

then add your module to the registry ([orbis-hub.github.io/registry](https://orbis-hub.github.io/registry/) has a submission form) and it shows up in everyone's store. list `languages` there too, the store shows them.

## layout

```
module.json        manifest (widgets, pages, settingsSchema, permissions, languages, discovery)
locales/           <lang>.json translations, english is the fallback
src/server.ts      runs inside the hub   → ctx.http / storage / events / scheduler / settings / hub / i18n / notify
src/client.tsx     runs in the browser   → widgets, pages, optional custom settings ui
src/logic.ts       plain functions, tested in logic.test.ts
dist/              build output (gitignored)
```

### server (`@orbis/sdk/server`)

`defineModule({ setup(ctx), teardown?(), eink?(ctx, req), einkTap?(ctx, req) })`. `ctx.http` is a hono router at `/api/m/<id>` (already authenticated; who is calling arrives as `x-orbis-user` / `x-orbis-role`, set by the hub). validate every body: `parseBody(c, z.object({ … }))` answers bad input with a 400 for you, and `z` comes from the sdk, so you do not add zod. `ctx.storage.get/set` is a kv store; `ctx.storage.sql("CREATE TABLE IF NOT EXISTS {{t:items}} (...)")` gives you your own sqlite tables. `ctx.events.publish("name", payload)` pushes to clients. `ctx.i18n.t("key", { count })` translates for notifications and e-ink. `ctx.fetch` only reaches public addresses unless you declare `network:lan`.

### client (`@orbis/sdk/client`)

`defineClient({ widgets, pages, settings?, widgetConfig? })`. widgets receive `{ instance, config, size, editing }`. hooks: `useT()`, `useModuleApi()`, `useModuleQuery(path, { refetchOn, intervalMs })`, `useModuleEvents(name, cb)`, `useModuleSettings()`, `useModuleDevices()`, `useModule()` (`locale`, `timezone`, `language`, …). ui components come from `@orbis/ui` (`Window`, `Button`, `Icon`, `Modal`, `Field`, `Input`, `Chip`, `useToast`, …) and match the app's look, icons too: `<Icon name="calendar" />` (190+ pixelarticons). they are provided by the host, so they cost your bundle nothing.

react, react-dom, `@orbis/sdk/client` and `@orbis/ui` are **not bundled**: the host provides them at runtime, so there is one react instance and the client bundle stays small (this one is about 5 kb). the server bundle includes zod for the validation helpers.

## notes

- never trust input from the browser in `server.ts`; validate request bodies (`parseBody`) and path params (`parseValue`).
- module data is shared by everyone on the hub; check `x-orbis-role` before destructive actions.
- mark credentials in `settingsSchema` with `"format": "secret"`: members never get them back, admins see a password field.
- declare what you need in `permissions` (shown before install, enforced for store modules): `network:fetch`, `network:lan`, `storage`, `scheduler`, `devices:read`, `devices:claim`, `settings:read`, `notifications`, `network:scan`.
- every visible string goes through `useT()` / `ctx.i18n.t()`; more languages are one json file each.
- `minHub` is the oldest hub version your module supports; `0.2.0` for `useT()`, `ctx.i18n`, `ctx.hub` and `network:lan`.
- docs: [module developer guide](https://github.com/orbis-hub/orbis/wiki/Module-Developer-Guide) · [sdk reference](https://github.com/orbis-hub/orbis/wiki/SDK-Reference) · [languages](https://github.com/orbis-hub/orbis/wiki/Languages)
