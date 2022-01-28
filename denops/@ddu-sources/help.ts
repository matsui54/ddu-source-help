import {
  BaseSource,
  Item,
} from "https://deno.land/x/ddu_vim@v0.1.0/types.ts#^";
import { Denops } from "https://deno.land/x/ddu_vim@v0.1.0/deps.ts#^";
import { dirname, join } from "https://deno.land/std@0.120.0/path/mod.ts";
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

        try {
          const tagfiles =
            (await args.denops.eval("globpath(&rtp, 'doc/tags')") as string)
              .split("\n");
          for (const f of tagfiles) {
            console.log(f);
            const lines = Deno.readTextFileSync(f).split(/\r?\n/);
            const root = dirname(f);
            lines.map((line) => {
              const seg = line.split("\t");
              if (seg.length < 2) return;
              items.push({
                word: seg[0],
                action: {
                  path: join(root, seg[1]),
                  pattern: seg[0],
                },
              });
            });
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
