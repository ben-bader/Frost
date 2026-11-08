export default function BrokenLoaderPage() {
  return <h1>broken</h1>;
}

export async function loader(): Promise<never> {
  throw new Error("loader exploded");
}
