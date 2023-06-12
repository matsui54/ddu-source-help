import { BaseSource, Item } from "https://deno.land/x/ddu_vim@v2.8.4/types.ts";
import { Denops, op } from "https://deno.land/x/ddu_vim@v2.8.4/deps.ts";
import { dirname, join } from "https://deno.land/std@0.187.0/path/mod.ts";
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
        const helpMap: Record<string, string[]> = langs.reduce(
          (acc, lang) => ({ ...acc, [lang]: [] }),
          { en: [] },
        );

        try {
          const tagfiles =
            (await args.denops.eval("globpath(&rtp, 'doc/tags*')") as string)
              .split("\n");
          for (const f of tagfiles) {
            const m = f.match(/tags-(\w*)$/);
            if (m && langs.includes(m[1])) {
              helpMap[m[1]].push(f);
            } else if (/doc[\/\\]tags$/.test(f)) {
              helpMap["en"].push(f);
            }
          }
          const tagsMap: Record<string, HelpInfo[]> = {};

          const fileReadPromise = langs.flatMap((lang) =>
            helpMap[lang].map(async (f) => {
              const lines = (await Deno.readTextFile(f)).split(/\r?\n/);
              const root = dirname(f);
              lines.map((line) => {
                if (line.startsWith("!_TAG_FILE_ENCODING")) {
                  return;
                }
                const seg = line.split("\t");
                if (seg.length < 3) return;
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
            })
          );
          await Promise.all(fileReadPromise);

          const items = Object.entries(tagsMap).flatMap(([tag, infos]) => {
            if (args.sourceParams.style === "minimal" || infos.length < 2) {
              return {
                word: tag,
                action: {
                  word: tag,
                  path: infos[0].path,
                  pattern: "\\V" + infos[0].pattern,
                },
              };
            } else {
              return infos.map((info) => {
                const pattern = `${tag}@${info.lang}`;
                return {
                  word: pattern,
                  action: {
                    word: pattern,
                    path: info.path,
                    pattern: "\\V" + info.pattern,
                  },
                };
              });
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
