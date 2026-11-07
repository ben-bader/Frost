import type { Route } from "@frostjs/core";

const THEME_INIT = `try{var t=localStorage.getItem("frost-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.dataset.theme="dark";else if(t==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

/** Head tags shared by every route: Geist fonts + theme init (no FOUC). */
export const siteHead: Pick<Route.Metadata, "links" | "scripts"> = {
  links: [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap",
    },
  ],
  scripts: [{ content: THEME_INIT }],
};
