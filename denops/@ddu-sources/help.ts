import { BaseSource } from "jsr:@shougo/ddu-vim@~6.4.0/source";
import { Item } from "jsr:@shougo/ddu-vim@~6.4.0/types";
import { Denops } from "jsr:@denops/std@~7.6.0";
import * as fn from "jsr:@denops/std@~7.6.0/function";
import * as op from "jsr:@denops/std@~7.6.0/option";
import { dirname, join } from "jsr:@std/path@~1.0.6";
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
  override kind = "help";

  gather(args: {
    denops: Denops;
    sourceParams: Params;
  }): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        const langs = args.sourceParams.helpLang?.split(",") ??
          (await op.helplang.getGlobal(args.denops)).split(",");
        if (!langs.includes("en")) {
          langs.push("en");
        }
        const helpMap: Record<string, string[]> = langs.reduce(
          (acc: Record<string, string[]>, lang: string) => ({
            ...acc,
            [lang]: [],
          }),
          {},
        );

        try {
          const rtp = await op.runtimepath.getGlobal(args.denops);
          const tagfiles = (
            await fn.globpath(args.denops, rtp, "doc/tags*", true)
          ).split("\n");

          for (const f of tagfiles) {
            const m = f.match(/tags-(\w*)$/);
            if (m && langs.includes(m[1])) {
              helpMap[m[1]].push(f);
            } else if (/doc[\/\\]tags$/.test(f)) {
              helpMap["en"].push(f);
            }
          }
          const tagsMap: Map<string, HelpInfo[]> = new Map<
            string,
            HelpInfo[]
          >();

          const fileReadPromise = langs.flatMap((lang: string) =>
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
                if (!tagsMap.has(tag)) {
                  tagsMap.set(tag, []);
                }
                tagsMap.get(tag)?.push({
                  lang,
                  path: join(root, path),
                  pattern: pattern.slice(1),
                });
              });
            })
          );
          await Promise.all(fileReadPromise);

          const items = Array.from(tagsMap.entries()).flatMap(
            ([tag, infos]) => {
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
            },
          );
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
