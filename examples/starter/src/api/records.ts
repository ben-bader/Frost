import { json } from "@frostjs/server";
import { queryPrivilegedRecords } from "../server/database.server.js";

export async function GET(): Promise<Response> {
  const records = await queryPrivilegedRecords();
  return json({
    source: "database.server.ts (Server-Only)",
    records,
  });
}

