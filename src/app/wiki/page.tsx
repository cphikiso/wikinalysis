import { Suspense } from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import WikiClient from "./wiki-client";

export default function WikiPage() {
  return (
    <Suspense>
      <WikiClient />
    </Suspense>
  );
}
