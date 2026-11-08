export async function loader() {
  return { message: "loaded" };
}

export default function WithLoaderPage() {
  return <h1>With loader</h1>;
}
