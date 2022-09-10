import { BaseSource, Item } from "https://deno.land/x/ddu_vim@v1.10.1/types.ts";
import { Denops, op } from "https://deno.land/x/ddu_vim@v1.10.1/deps.ts";
import { dirname, join } from "https://deno.land/std@0.155.0/path/mod.ts";
import { ActionData } from "../@ddu-kinds/help.ts";

type Params = {
  style: "allLang" | "minimal";
  helpLang?: string;
};

type HelpInfo = {
  lang: string;
  path: string;
  pattern: string;
};

export class Source extends BaseSource<Params> {
  kind = "help";

  gather(args: {
    denops: Denops;
    sourceParams: Params;
  }): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        const langs = args.sourceParams.helpLang?.split(",") ??
          (await op.helplang.getGlobal(args.denops)).split(",");
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
            } else if (/doc(:?\/|\\)tags$/.test(f)) {
              helpMap["en"].push(f);
            }
          }
          const tagsMap: Record<string, HelpInfo[]> = {};
          for (const lang of langs) {
            for (const f of helpMap[lang]) {
              const lines = Deno.readTextFileSync(f).split(/\r?\n/);
              const root = dirname(f);
              lines.map((line) => {
                const seg = line.split("\t");
                if (seg.length < 2) return;
                const [tag, path, pattern] = seg;
                if (!tagsMap[tag]) {
                  tagsMap[tag] = [];
                }
                tagsMap[tag].push({
                  lang,
                  path: join(root, path),
                  pattern: pattern.slice(1),
                });
              });
            }
          }
          const items: Item<ActionData>[] = [];
          Object.keys(tagsMap).map((tag) => {
            const info = tagsMap[tag];
            if (args.sourceParams.style == "minimal" || info.length < 2) {
              items.push({
                word: tag,
                action: {
                  word: tag,
                  path: info[0].path,
                  pattern: "\\V" + info[0].pattern,
                },
              });
            } else {
              for (const i of info) {
                const pattern = `${tag}@${i.lang}`;
                items.push({
                  word: pattern,
                  action: {
                    word: pattern,
                    path: i.path,
                    pattern: "\\V" + i.pattern,
                  },
                });
              }
            }
          });
          controller.enqueue(items);
        } catch (e) {
          console.error(e);
        }
        controller.close();
      },
    });
  }

  params(): Params {
    return {
      style: "minimal",
    };
  }
}
