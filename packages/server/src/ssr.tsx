import { renderToString } from "react-dom/server";
import { FrostDocument, FrostProvider, FrostErrorBoundary, type FrostClientState } from "@frostjs/react";
import type { FrostAssets, RouteModule, FrostRequestContext } from "@frostjs/core";
import { html } from "./response.js";

export interface SsrRenderOptions {
  routeModule: RouteModule;
  layoutModules?: RouteModule[];
  params: Record<string, string>;
  pathname: string;
  request: Request;
  context: FrostRequestContext;
  assets?: FrostAssets;
}

export async function renderRouteToHtml(options: SsrRenderOptions): Promise<Response> {
  const { routeModule, params, pathname, request, context, assets } = options;

  let loaderData: unknown = null;

  // 1. Execute route loader if present
  if (routeModule.loader) {
    try {
      const url = new URL(request.url);
      const result = await routeModule.loader({
        request,
        params,
        url,
        context,
      });

      // If loader returned a Response directly (e.g. redirect or 404), return it immediately
      if (result instanceof Response) {
        return result;
      }

      loaderData = result;
    } catch (err) {
      if (err instanceof Response) {
        return err;
      }
      console.error(`[Frost] Error executing loader for route ${pathname}:`, err);
      return html(
        `<!DOCTYPE html><html><head><title>500 Internal Server Error</title></head><body><h1>Loader Error</h1><p>${
          err instanceof Error ? err.message : "Internal Error"
        }</p></body></html>`,
        { status: 500 }
      );
    }
  }

  // 2. Resolve metadata if present
  let title: string | undefined;
  if (routeModule.metadata) {
    try {
      const url = new URL(request.url);
      const meta =
        typeof routeModule.metadata === "function"
          ? await routeModule.metadata({ data: loaderData, params, url })
          : routeModule.metadata;
      title = meta.title;
    } catch (err) {
      console.warn(`[Frost] Error resolving metadata for route ${pathname}:`, err);
    }
  }

  // 3. Render React component to HTML
  const Component = routeModule.default;
  if (!Component) {
    return html(
      `<!DOCTYPE html><html><head><title>Route has no default export</title></head><body><h1>Route Missing Default Component</h1><p>The route module at ${pathname} does not export a default React component.</p></body></html>`,
      { status: 500 }
    );
  }

  let renderedContent: React.ReactNode = <Component data={loaderData} params={params} />;

  // Wrap with layouts from leaf to root
  if (options.layoutModules && options.layoutModules.length > 0) {
    for (let i = options.layoutModules.length - 1; i >= 0; i--) {
      const layoutMod = options.layoutModules[i];
      const LayoutComp = layoutMod?.default;
      if (LayoutComp) {
        renderedContent = (
          <LayoutComp data={loaderData} params={params}>
            {renderedContent}
          </LayoutComp>
        );
      }
    }
  }

  const clientState: FrostClientState = {
    pathname,
    params,
    loaderData,
    assets,
  };

  const appHtml = renderToString(
    <FrostProvider value={clientState}>
      <FrostDocument title={title}>
        <FrostErrorBoundary>
          {renderedContent}
        </FrostErrorBoundary>
      </FrostDocument>
    </FrostProvider>
  );

  return html(`<!DOCTYPE html>\n${appHtml}`);
}
