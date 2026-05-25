// @ts-nocheck
import * as __fd_glob_9 from "../content/resources/self-hosting-cost-breakdown.mdx?collection=resources"
import * as __fd_glob_8 from "../content/resources/introducing-openship.mdx?collection=resources"
import * as __fd_glob_7 from "../content/resources/how-ai-builds-work.mdx?collection=resources"
import * as __fd_glob_6 from "../content/docs/quickstart.mdx?collection=docs"
import * as __fd_glob_5 from "../content/docs/installation.mdx?collection=docs"
import * as __fd_glob_4 from "../content/docs/index.mdx?collection=docs"
import * as __fd_glob_3 from "../content/docs/first-deployment.mdx?collection=docs"
import * as __fd_glob_2 from "../content/docs/cli.mdx?collection=docs"
import * as __fd_glob_1 from "../content/docs/api.mdx?collection=docs"
import { default as __fd_glob_0 } from "../content/docs/_meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docs("docs", "content/docs", {"_meta.json": __fd_glob_0, }, {"api.mdx": __fd_glob_1, "cli.mdx": __fd_glob_2, "first-deployment.mdx": __fd_glob_3, "index.mdx": __fd_glob_4, "installation.mdx": __fd_glob_5, "quickstart.mdx": __fd_glob_6, });

export const resources = await create.docs("resources", "content/resources", {}, {"how-ai-builds-work.mdx": __fd_glob_7, "introducing-openship.mdx": __fd_glob_8, "self-hosting-cost-breakdown.mdx": __fd_glob_9, });