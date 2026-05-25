// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"api.mdx": () => import("../content/docs/api.mdx?collection=docs"), "cli.mdx": () => import("../content/docs/cli.mdx?collection=docs"), "first-deployment.mdx": () => import("../content/docs/first-deployment.mdx?collection=docs"), "index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "installation.mdx": () => import("../content/docs/installation.mdx?collection=docs"), "quickstart.mdx": () => import("../content/docs/quickstart.mdx?collection=docs"), }),
  resources: create.doc("resources", {"how-ai-builds-work.mdx": () => import("../content/resources/how-ai-builds-work.mdx?collection=resources"), "introducing-openship.mdx": () => import("../content/resources/introducing-openship.mdx?collection=resources"), "self-hosting-cost-breakdown.mdx": () => import("../content/resources/self-hosting-cost-breakdown.mdx?collection=resources"), }),
};
export default browserCollections;