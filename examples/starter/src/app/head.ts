import type { Route } from "@frostjs/core";

/** Head tags shared by every route: Geist fonts. */
export const siteHead: Pick<Route.Metadata, "links"> = {
  links: [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap",
    },
  ],
};
