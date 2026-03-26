# <img alt="Bevy Remote Playground Logo" src="./public/icon.svg" width="32"> Bevy Remote Playground

A small web UI for running [Bevy](https://bevy.org/) WebAssembly applications in the browser and interacting with them through the [Bevy Remote Protocol](https://docs.rs/bevy/latest/bevy/remote/) (BRP). Applications require the Bevy Remote WASM plugin.

## Usage

Open the published site: <https://splo.github.io/bevy-remote-playground>.

You’ll land on a launcher with two options:

- Demo: this loads the bundled demo WASM app shipped in `public/wasm`.
- Custom: this allows to load your own app.

### Custom App Requirements

To load your own app:

1. Ensure your Bevy application is correctly built:
    1. In your `Cargo.toml` dependencies, include `bevy_remote_wasm` and `bevy_remote`
    with default features disabled to avoid the `bevy_remote/http` feature (which doesn't build on WASM).
    2. Add the `RemotePlugin` and `RemoteWasmPlugin` plugins to your Bevy app.
    3. Ensure the `rpc.discover` remote method is enabled, which is the case with `RemotePlugin::default()`.
    4. Build your app for the `wasm32-unknown-unknown` target.
    5. Generate the JS bindings using `wasm-bindgen --target web` (directly or via tools like `wasm-pack` or `trunk`). See the [docs](https://wasm-bindgen.github.io/wasm-bindgen/). You'll obtain files including a `.js` and a `_bg.wasm`.
2. In the launcher page, select **Custom** and provide the `.js` and `.wasm` files.
3. If your Bevy application specifies a canvas (`WindowPlugin { primary_window: Some(Window { canvas: Some("#my-bevy-canvas".to_string()) }) }`), enter it in the dedicated field.
4. Click **Load**.

## Development

This is a [Vite](https://vite.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [shadcn/ui](https://ui.shadcn.com/) + [Tailwind](https://tailwindcss.com/) web application.

### Setup

Requirements:

- [Node.js](https://nodejs.org/).

Install dependencies:

```bash
npm install
```

### Run Development Server

```bash
npm run watch
```

Starts a Vite server serving the web UI.

### Check and Lint

```bash
npm run check
```

This runs TypeScript type-checking and ESLint in check-only mode.

Apply ESLint fixes:

```bash
npm run lint
```

### Preview the Production Build Locally

```bash
npm run preview
```

### Build for Production

```bash
npm run build
```

This builds the web UI into a `dist/` directory ready for production deployment.

Vite copies files from `public/` into `dist/`, including the bundled demo WASM files from `public/wasm`.

### Clean Generated Files

```bash
npm run clean
```

### shadcn/ui

Use the shadcn/ui CLI to interact with the UI component library:

```bash
npx shadcn@latest info
```

### Project layout

- `public/wasm/`: Bundled demo WASM assets included with the site.
- `src/`: React application entrypoint and styles.
- `src/lib/`: Canvas and BRP integration utilities. [`useBrp.ts`](./src/lib/useBrp.ts) defines a somewhat reusable React function that allows to easily load the typed BRP bridge object.
- `src/components/`: Playground and launcher UI components.
- `src/components/ui/`: Reusable shadcn/ui primitives, managed by the `shadcn/ui` CLI.

### GitHub Actions

- On pushes and pull requests, run CI check and build tasks.
- On Git tags matching `v*`, build `dist/`, uploads it as a Pages artifact, and deploys it with GitHub Pages.

The GitHub Pages deployment workflow sets `VITE_BASE_PATH` from the `base_path` output of `actions/configure-pages`, and Vite reads that environment variable in its config so project-site deployments generate asset URLs under the correct repository path automatically.

### License

Dual-licensed under Apache-2.0 and MIT. See `LICENSE-APACHE` and `LICENSE-MIT`.
