import type { Route, StandardSchemaV1 } from "@frostjs/core";

interface HelloData {
  greeting: string;
  name: string;
}

// Minimal Standard Schema validator — works with zod/valibot too.
const nameSchema: StandardSchemaV1<string> = {
  "~standard": {
    version: 1,
    vendor: "frost-starter",
    validate: (value) => {
      const issues =
        typeof value === "object" &&
        value !== null &&
        typeof (value as Record<string, unknown>).name === "string" &&
        /^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/.test((value as { name: string }).name)
          ? []
          : [{ message: "name must be 1-32 letters, digits, _ or -" }];
      return issues.length
        ? { issues }
        : { value: (value as { name: string }).name };
    },
  },
};

export const contract = {
  params: nameSchema,
};

export const loader = async ({ params }: Route.LoaderArgs<{ name: string }>): Promise<HelloData> => ({
  greeting: "Hello",
  name: params.name,
});

export const metadata = ({
  data,
}: Route.MetadataArgs<HelloData>): Route.Metadata => ({
  title: data ? `${data.greeting}, ${data.name}!` : "Hello",
});

export default function HelloPage({ data }: Route.ComponentProps<HelloData, { name: string }>): React.JSX.Element {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center px-6">
      <div className="text-center">
        <p className="font-mono text-sm text-mint">contract.params validated</p>
        <h1 className="mt-2 font-display text-5xl font-semibold text-ink-hi">
          {data.greeting}, {data.name}!
        </h1>
        <p className="mt-4 text-ink">
          This route uses <code>defineRoute</code>-style inference: typed params,
          loader data, and metadata.
        </p>
      </div>
    </section>
  );
}
