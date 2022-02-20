import {
  BaseSource,
  Item,
} from "https://deno.land/x/ddu_vim@v0.12.2/types.ts#^";
import { Denops, op } from "https://deno.land/x/ddu_vim@v0.12.2/deps.ts#^";
import { dirname, join } from "https://deno.land/std@0.126.0/path/mod.ts";
import { ActionData } from "../@ddu-kinds/help.ts";

type Params = {};

export class Source extends BaseSource<Params> {
  kind = "help";

  gather(args: {
    denops: Denops;
    sourceParams: Params;
  }): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        const items: Item<ActionData>[] = [];
        const langs = (await op.helplang.getGlobal(args.denops)).split(",");
        const tagsMap: Record<string, boolean> = {};
        const helpMap: Record<string, string[]> = {};
        if (!langs.includes("en")) {
          langs.push("en");
        }
        for (const lang of langs) {
          helpMap[lang] = [];
        }

        try {
          const tagfiles =
            (await args.denops.eval("globpath(&rtp, 'doc/tags*')") as string)
              .split("\n");
          for (const f of tagfiles) {
            const m = f.match(/tags-(\w*)$/);
            if (m) {
              if (langs.includes(m[1])) {
                helpMap[m[1]].push(f);
              }
            } else if (/doc\/tags$/.test(f)) {
              helpMap["en"].push(f);
            }
          }
          for (const lang of langs) {
            for (const f of helpMap[lang]) {
              const lines = Deno.readTextFileSync(f).split(/\r?\n/);
              const root = dirname(f);
              lines.map((line) => {
                const seg = line.split("\t");
                if (seg.length < 2) return;
                if (tagsMap[seg[0]]) return;
                items.push({
                  word: seg[0],
                  action: {
                    path: join(root, seg[1]),
                    pattern: seg[0],
                  },
                });
                tagsMap[seg[0]] = true;
              });
            }
          }
          controller.enqueue(items);
        } catch (e) {
          console.error(e);
        }
        controller.close();
      },
    });
  }

  params(): Params {
    return {};
  }
}
