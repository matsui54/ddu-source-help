import {
  ActionFlags,
  BaseKind,
  DduItem,
} from "https://deno.land/x/ddu_vim@v0.1.0/types.ts#^";
import { Denops } from "https://deno.land/x/ddu_vim@v0.1.0/deps.ts";
import { ActionArguments } from "https://deno.land/x/ddu_vim@v0.1.0/base/kind.ts";

export type ActionData = {
  path: string;
  pattern: string;
};

type Params = Record<never, never>;

export class Kind extends BaseKind<Params> {
  actions: Record<
    string,
    (args: ActionArguments<Params>) => Promise<ActionFlags>
  > = {
    open: async (args: { denops: Denops; items: DduItem[] }) => {
      const action = args.items[0]?.action as ActionData;
      await args.denops.cmd(`silent help ${action.pattern}`);
      return Promise.resolve(ActionFlags.None);
    },
    vsplit: async (args: { denops: Denops; items: DduItem[] }) => {
      const action = args.items[0]?.action as ActionData;
      await args.denops.cmd(`silent vertical help ${action.pattern}`);
      return Promise.resolve(ActionFlags.None);
    },
    tabopen: async (args: { denops: Denops; items: DduItem[] }) => {
      const action = args.items[0]?.action as ActionData;
      await args.denops.cmd(`silent tab help ${action.pattern}`);
      return Promise.resolve(ActionFlags.None);
    },
  };

  params(): Params {
    return {};
  }
}
