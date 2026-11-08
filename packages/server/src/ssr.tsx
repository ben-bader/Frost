import type { ReactNode } from "react";
import { renderToString, renderToReadableStream } from "react-dom/server";
import { FrostDocument, FrostProvider, FrostErrorBoundary, type FrostClientState } from "@frostjs/react";
import {
  createErrorReport,
  createContractError,
  validateContractValue,
  FROST_ERROR_CODES,
  formatErrorReportTerminal,
  type FrostAssets,
  type FrostErrorReport,
  type FrostRequestContext,
  type Route,
  type RouteModule,
} from "@frostjs/core";
import { html, htmlStream } from "./response.js";

export interface SsrRenderOptions {
  routeModule: RouteModule;
  layoutModules?: RouteModule[];
  params: Record<string, string>;
  pathname: string;
  request: Request;
  context: FrostRequestContext;
  assets?: FrostAssets;
  /** Result of the route action when re-rendering after a POST. */
  actionData?: unknown;
  /** HTTP status for the rendered document (default 200). */
  status?: number;
  /** Error-boundary module (error.tsx) rendered when loaders/render fail. */
  errorBoundaryModule?: RouteModule;
  /** Document language for the html element (a11y). */
  lang?: string;
  /** Dev hook: receives structured error reports for overlay/terminal. */
  onError?: (report: FrostErrorReport) => void;
  /** Dev-only: render twice and warn on nondeterministic output (F19). */
  checkDeterminism?: boolean;
  /** Validate loader return values against route contracts. */
  validateContracts?: boolean;
  /** Route id (file path) embedded in client state for the router. */
  routeId?: string;
  /** Client-router manifest emitted as window.__FROST_ROUTES__. */
  routeManifest?: unknown;
  /** Stream the document with Suspense support (config.ssr.streaming). */
  streaming?: boolean;
}

type Settled<T> =
  | { status: "ok"; value: T }
  | { status: "err"; error: unknown }
  | { status: "empty" };

interface LoaderSpec {
  module: RouteModule;
  role: "route" | "layout";
}

/**
 * Runs the route loader and every layout loader in parallel. Layout
 * loaders receive the same args; their results feed their own `data`
 * prop. Shared by HTML rendering and the client-router data endpoint.
 */
export async function runRouteLoaders(options: {
  routeModule: RouteModule;
  layoutModules?: RouteModule[];
  params: Record<string, string>;
  request: Request;
  url: URL;
  context: FrostRequestContext;
  validateContracts?: boolean;
}): Promise<Settled<unknown>[]> {
  const {
    routeModule,
    layoutModules = [],
    params,
    request,
    url,
    context,
    validateContracts,
  } = options;

  const specs: LoaderSpec[] = [
    { module: routeModule, role: "route" },
    ...layoutModules.map((m) => ({ module: m, role: "layout" as const })),
  ];

  const settled = await Promise.all(
    specs.map((spec) => {
      if (!spec.module.loader) return Promise.resolve<Settled<unknown>>({ status: "empty" });
      return Promise.resolve()
        .then(() => spec.module.loader!({ request, params, url, context }))
        .then(
          (value): Settled<unknown> => ({ status: "ok", value }),
          (error): Settled<unknown> => ({ status: "err", error })
        );
    })
  );

  // Contract validation: a loader return that violates its schema becomes
  // a FROST_E_CONTRACT error (surfaced through the error boundary).
  if (validateContracts) {
    for (let i = 0; i < settled.length; i++) {
      const s = settled[i]!;
      if (s.status !== "ok" || s.value instanceof Response) continue;
      const contract = specs[i]!.module.contract;
      if (!contract?.loader) continue;
      const v = validateContractValue(contract.loader, s.value);
      if (!v.ok) {
        settled[i] = {
          status: "err",
          error: createContractError("loader", v.issues),
        };
      }
    }
  }

  return settled;
}

function firstDiffIndex(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return i;
  }
  return len;
}

function formatErrorReportTerminalSafe(report: FrostErrorReport): string {
  try {
    return formatErrorReportTerminal(report);
  } catch {
    return `${report.code}: ${report.message}`;
  }
}

function resolveMetadata(
  mod: RouteModule,
  args: Route.MetadataArgs
): Promise<Route.Metadata | undefined> {
  if (!mod.metadata) return Promise.resolve(undefined);
  try {
    const meta =
      typeof mod.metadata === "function" ? mod.metadata(args) : mod.metadata;
    return Promise.resolve(meta);
  } catch {
    return Promise.resolve(undefined);
  }
}

/** Child wins per-field; arrays concatenate parent -> child. */
function mergeMetadata(
  parent: Route.Metadata | undefined,
  child: Route.Metadata | undefined
): Route.Metadata | undefined {
  if (!parent) return child;
  if (!child) return parent;
  const og = { ...parent.openGraph, ...child.openGraph };
  const twitter = { ...parent.twitter, ...child.twitter };
  const hasOg = Object.values(og).some((v) => v !== undefined);
  const hasTw = Object.values(twitter).some((v) => v !== undefined);
  return {
    title: child.title ?? parent.title,
    titleTemplate: child.titleTemplate ?? parent.titleTemplate,
    description: child.description ?? parent.description,
    canonical: child.canonical ?? parent.canonical,
    robots: child.robots ?? parent.robots,
    openGraph: hasOg ? og : undefined,
    twitter: hasTw ? twitter : undefined,
    jsonLd: child.jsonLd ?? parent.jsonLd,
    meta: [...(parent.meta ?? []), ...(child.meta ?? [])],
    links: [...(parent.links ?? []), ...(child.links ?? [])],
    scripts: [...(parent.scripts ?? []), ...(child.scripts ?? [])],
  };
}

/** Applies ancestor title templates, nearest template first. */
function applyTitleTemplates(
  metas: Array<Route.Metadata | undefined>
): string | undefined {
  let title: string | undefined;
  for (let i = metas.length - 1; i >= 0; i--) {
    const t = metas[i]?.title;
    if (t !== undefined) {
      title = t;
      break;
    }
  }
  if (title === undefined) return undefined;
  for (let i = metas.length - 2; i >= 0; i--) {
    const tpl = metas[i]?.titleTemplate;
    if (!tpl) continue;
    title = tpl.includes("%s") ? tpl.replace("%s", title) : tpl;
  }
  return title;
}

function metadataToHead(
  meta: Route.Metadata | undefined,
  title: string | undefined,
  nonce: string | undefined
): ReactNode {
  if (!meta && !title) return undefined;
  const nodes: ReactNode[] = [];

  if (meta?.description) {
    nodes.push(<meta key="description" name="description" content={meta.description} />);
  }
  if (meta?.canonical) {
    nodes.push(<link key="canonical" rel="canonical" href={meta.canonical} />);
  }
  if (meta?.robots) {
    nodes.push(<meta key="robots" name="robots" content={meta.robots} />);
  }
  if (meta?.openGraph) {
    const og = meta.openGraph;
    const ogTitle = og.title ?? title;
    const ogDesc = og.description ?? meta.description;
    if (ogTitle) nodes.push(<meta key="og:title" property="og:title" content={ogTitle} />);
    if (ogDesc) nodes.push(<meta key="og:description" property="og:description" content={ogDesc} />);
    if (og.image) nodes.push(<meta key="og:image" property="og:image" content={og.image} />);
    if (og.type) nodes.push(<meta key="og:type" property="og:type" content={og.type} />);
    if (og.url) nodes.push(<meta key="og:url" property="og:url" content={og.url} />);
    if (og.siteName) nodes.push(<meta key="og:site_name" property="og:site_name" content={og.siteName} />);
  }
  if (meta?.twitter) {
    const tw = meta.twitter;
    if (tw.card) nodes.push(<meta key="tw:card" name="twitter:card" content={tw.card} />);
    const twTitle = tw.title ?? title;
    const twDesc = tw.description ?? meta.description;
    if (twTitle) nodes.push(<meta key="tw:title" name="twitter:title" content={twTitle} />);
    if (twDesc) nodes.push(<meta key="tw:desc" name="twitter:description" content={twDesc} />);
    if (tw.image) nodes.push(<meta key="tw:image" name="twitter:image" content={tw.image} />);
    if (tw.site) nodes.push(<meta key="tw:site" name="twitter:site" content={tw.site} />);
  }
  if (meta?.jsonLd) {
    const blocks = Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd];
    blocks.forEach((block, i) => {
      nodes.push(
        <script
          key={`jsonld-${i}`}
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            // Escape "</" so a payload can never terminate the element.
            __html: JSON.stringify(block).replace(/<\//g, "<\\/"),
          }}
        />
      );
    });
  }
  meta?.meta?.forEach((m, i) => {
    nodes.push(<meta key={`meta-${i}`} {...m} />);
  });
  meta?.links?.forEach((l, i) => {
    nodes.push(<link key={`link-${i}`} {...l} />);
  });
  meta?.scripts?.forEach((s, i) => {
    if (s.src) {
      nodes.push(
        <script
          key={`script-${i}`}
          src={s.src}
          type={s.type}
          async={s.async}
          nonce={nonce}
        />
      );
    } else if (s.content) {
      nodes.push(
        <script
          key={`script-${i}`}
          type={s.type ?? "text/javascript"}
          nonce={nonce}
          // Escape sequences that could terminate the script element or
          // open an HTML comment inside inline script content.
          dangerouslySetInnerHTML={{
            __html: s.content
              .replace(/<\/script/gi, "<\\/script")
              .replace(/<!--/g, "<\\!--"),
          }}
        />
      );
    }
  });
  return nodes.length > 0 ? <>{nodes}</> : undefined;
}

interface RenderTreeOptions {
  content: ReactNode;
  clientState: FrostClientState;
  title?: string;
  head?: ReactNode;
  lang?: string;
  routeManifest?: unknown;
}

function documentElement(opts: RenderTreeOptions): ReactNode {
  return (
    <FrostProvider value={opts.clientState}>
      <FrostDocument title={opts.title} head={opts.head} lang={opts.lang} routeManifest={opts.routeManifest}>
        <FrostErrorBoundary>{opts.content}</FrostErrorBoundary>
      </FrostDocument>
    </FrostProvider>
  );
}

function renderTree(opts: RenderTreeOptions): string {
  return renderToString(documentElement(opts));
}

const DOCTYPE = new TextEncoder().encode("<!DOCTYPE html>\n");

/** Prefixes a byte stream with the doctype declaration. */
function prependDoctype(stream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(DOCTYPE);
      const reader = stream.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) controller.enqueue(value);
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

/**
 * Minimal styled document for cases where no route module exists at all
 * (bare 404/500 fallbacks). Always produces a full FrostDocument page.
 */
export function renderSimpleDocument(options: {
  title: string;
  heading: string;
  detail?: string;
  status: number;
  lang?: string;
  context?: FrostRequestContext;
}): Response {
  const nonce = options.context?.cspNonce;
  const appHtml = renderTree({
    content: (
      <main>
        <h1>{options.heading}</h1>
        {options.detail ? <p>{options.detail}</p> : null}
      </main>
    ),
    clientState: {
      pathname: "/",
      params: {},
      loaderData: null,
      cspNonce: nonce,
    },
    title: options.title,
    lang: options.lang,
  });
  return html(`<!DOCTYPE html>\n${appHtml}`, { status: options.status });
}

export async function renderRouteToHtml(options: SsrRenderOptions): Promise<Response> {
  const {
    routeModule,
    layoutModules = [],
    params,
    pathname,
    request,
    context,
    assets,
    actionData,
    status = 200,
    errorBoundaryModule,
    lang,
    onError,
    checkDeterminism,
    validateContracts,
    routeId,
    routeManifest,
    streaming,
  } = options;

  const url = new URL(request.url);

  // 1. Run the route loader and every layout loader in parallel. Layout
  //    loaders receive the same args; their results feed their own
  //    `data` prop. The first failure (route first, then layouts in
  //    root->leaf order) decides the error page.
  const settled = await runRouteLoaders({
    routeModule,
    layoutModules,
    params,
    request,
    url,
    context,
    validateContracts,
  });

  const routeSettled = settled[0]!;

  // A route loader may short-circuit with a Response (redirect, 404, ...).
  if (routeSettled.status === "ok" && routeSettled.value instanceof Response) {
    return routeSettled.value;
  }

  const loaderError = settled.find((s) => s.status === "err");
  const loaderData =
    routeSettled.status === "ok" && !(routeSettled.value instanceof Response)
      ? routeSettled.value
      : null;
  const layoutData = layoutModules.map((_, i) => {
    const s = settled[i + 1];
    return s && s.status === "ok" ? s.value : undefined;
  });

  const buildClientState = (data: unknown): FrostClientState => ({
    pathname,
    routeId,
    params,
    loaderData: data,
    actionData,
    layoutData,
    assets,
    cspNonce: context.cspNonce,
  });

  /** Renders the error boundary (or a minimal styled fallback) inside the layout chain. */
  const renderFailure = async (
    err: unknown,
    code: (typeof FROST_ERROR_CODES)[keyof typeof FROST_ERROR_CODES]
  ): Promise<Response> => {
    onError?.(
      createErrorReport(err, { runtime: "server", route: pathname, code })
    );
    const error = err instanceof Error ? err : new Error(String(err));

    if (errorBoundaryModule?.default) {
      try {
        let content: ReactNode = (
          <errorBoundaryModule.default error={error} data={null} params={params} />
        );
        for (let i = layoutModules.length - 1; i >= 0; i--) {
          const LayoutComp = layoutModules[i]?.default;
          if (LayoutComp) {
            content = (
              <LayoutComp data={layoutData[i]} params={params}>
                {content}
              </LayoutComp>
            );
          }
        }
        const appHtml = renderTree({
          content,
          clientState: buildClientState(loaderData),
          title: "Error",
          lang,
        });
        return html(`<!DOCTYPE html>\n${appHtml}`, { status: 500 });
      } catch {
        // Fall through to the minimal styled page.
      }
    }

    // Minimal styled document (F13): correct status, FrostDocument chrome.
    try {
      const appHtml = renderTree({
        content: (
          <main>
            <h1>Something went wrong</h1>
            <p>{error.message}</p>
          </main>
        ),
        clientState: buildClientState(null),
        title: "Error",
        lang,
      });
      return html(`<!DOCTYPE html>\n${appHtml}`, { status: 500 });
    } catch {
      return html(
        `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Server Error</h1></body></html>`,
        { status: 500 }
      );
    }
  };

  if (loaderError && loaderError.status === "err") {
    return renderFailure(loaderError.error, FROST_ERROR_CODES.LOADER);
  }

  // 2. Resolve metadata for layouts (root->leaf) and the route in parallel.
  const metaArgsFor = (data: unknown): Route.MetadataArgs => ({
    data,
    params,
    url,
  });
  const metaSpecs: Array<{ module: RouteModule; data: unknown }> = [
    ...layoutModules.map((m, i) => ({ module: m, data: layoutData[i] })),
    { module: routeModule, data: loaderData },
  ];
  const resolvedMetas = await Promise.all(
    metaSpecs.map((s) => resolveMetadata(s.module, metaArgsFor(s.data)))
  );

  let mergedMeta: Route.Metadata | undefined;
  for (const m of resolvedMetas) {
    mergedMeta = mergeMetadata(mergedMeta, m);
  }
  const title = applyTitleTemplates(resolvedMetas);
  const head = metadataToHead(mergedMeta, title, context.cspNonce);

  // 3. Render the component tree.
  const Component = routeModule.default;
  if (!Component) {
    return html(
      `<!DOCTYPE html><html><head><title>Route has no default export</title></head><body><h1>Route Missing Default Component</h1><p>The route module at ${pathname} does not export a default React component.</p></body></html>`,
      { status: 500 }
    );
  }

  let content: ReactNode = (
    <Component data={loaderData} actionData={actionData} params={params} />
  );

  // Wrap with layouts from leaf to root; each layout receives its own
  // loader data via the `data` prop.
  for (let i = layoutModules.length - 1; i >= 0; i--) {
    const LayoutComp = layoutModules[i]?.default;
    if (LayoutComp) {
      content = (
        <LayoutComp data={layoutData[i]} actionData={actionData} params={params}>
          {content}
        </LayoutComp>
      );
    }
  }

  const clientState = buildClientState(loaderData);
  const treeOpts: RenderTreeOptions = {
    content,
    clientState,
    title,
    head,
    lang,
    routeManifest,
  };

  // Streaming SSR: flush the shell as soon as it is ready; Suspense
  // boundaries inside the tree stream in later. Status/headers are set
  // before the first byte because all loaders already resolved.
  // Disabled while the dev determinism check needs string output.
  if (streaming && !checkDeterminism) {
    try {
      const stream = await renderToReadableStream(documentElement(treeOpts), {
        onError: (err) => {
          onError?.(
            createErrorReport(err, {
              runtime: "server",
              route: pathname,
              code: FROST_ERROR_CODES.RENDER,
            })
          );
        },
      });
      return htmlStream(prependDoctype(stream), { status });
    } catch (err) {
      return renderFailure(err, FROST_ERROR_CODES.RENDER);
    }
  }

  let appHtml: string;
  try {
    appHtml = renderTree(treeOpts);
  } catch (renderErr) {
    return renderFailure(renderErr, FROST_ERROR_CODES.RENDER);
  }

  // Dev-only determinism check (F19): render twice and compare. A diff
  // usually means Date.now/Math.random/locale formatting leaked into
  // render output and will cause hydration mismatches.
  if (checkDeterminism) {
    try {
      const second = renderTree({ content, clientState, title, head, lang });
      if (second !== appHtml) {
        const idx = firstDiffIndex(appHtml, second);
        const line = appHtml.slice(0, idx).split("\n").length;
        const report = createErrorReport(
          new Error(
            `Nondeterministic render output on ${pathname} (first difference at output line ${line}). Typical culprits: Date.now(), Math.random(), locale-dependent formatting.`
          ),
          { runtime: "server", route: pathname, code: FROST_ERROR_CODES.HYDRATION, severity: "warning" }
        );
        console.warn(`\n${formatErrorReportTerminalSafe(report)}\n`);
        onError?.(report);
      }
    } catch {
      // Determinism check must never break rendering.
    }
  }

  return html(`<!DOCTYPE html>\n${appHtml}`, { status });
}
