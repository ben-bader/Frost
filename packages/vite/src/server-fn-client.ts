/** Client-side stub injected by the Vite plugin for server functions. */
export const SERVER_FN_CLIENT_ID = "virtual:frost/server-fn-client";
export const RESOLVED_SERVER_FN_CLIENT_ID = "\0frost:server-fn-client";

export function serverFnClientCode(fnPath: string): string {
  const prefix = fnPath.endsWith("/") ? fnPath.slice(0, -1) : fnPath;
  return `
export function frostServerFnFetch(id) {
  return function frostServerFn(input) {
    return fetch(${JSON.stringify(prefix)} + "/" + encodeURIComponent(id), {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ input: input === undefined ? null : input }),
    }).then(async function (res) {
      var data = null;
      try { data = await res.json(); } catch (e) { /* non-JSON */ }
      if (!res.ok || (data && data.error)) {
        var err = new Error(
          (data && data.error && data.error.message) ||
          ("Server function " + id + " failed (" + res.status + ")")
        );
        if (data && data.error && data.error.code) err.code = data.error.code;
        throw err;
      }
      return data ? data.result : undefined;
    });
  };
}
`;
}
