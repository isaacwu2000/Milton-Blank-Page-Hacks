import {
  Product,
  Workspace,
  SAMPLE,
  readPreviewConfig,
} from "./modules/sportsbuilder";
export default function App() {
  const preview = new URLSearchParams(location.search).get("preview");
  if (preview) {
    try {
      const config = readPreviewConfig(preview);
      return (
        <Workspace
          analysis={SAMPLE}
          tool={config}
          sample
          onBack={() => {}}
          profiles={[]}
          sessions={[]}
        />
      );
    } catch {
      return <p>Invalid preview configuration.</p>;
    }
  }
  return <Product />;
}
