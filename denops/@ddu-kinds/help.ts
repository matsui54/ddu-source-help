import {
  ActionArguments,
  ActionFlags,
  BaseKind,
  DduItem,
  Previewer,
} from "../../../../Shougo/ddu.vim/denops/ddu/types.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v1.5.0/deps.ts";

export type ActionData = {
  word: string;
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
      await args.denops.cmd(`silent help ${action.word}`);
      return Promise.resolve(ActionFlags.None);
    },
    vsplit: async (args: { denops: Denops; items: DduItem[] }) => {
      const action = args.items[0]?.action as ActionData;
      await args.denops.cmd(`silent vertical help ${action.word}`);
      return Promise.resolve(ActionFlags.None);
    },
    tabopen: async (args: { denops: Denops; items: DduItem[] }) => {
      const action = args.items[0]?.action as ActionData;
      await args.denops.cmd(`silent tab help ${action.word}`);
      return Promise.resolve(ActionFlags.None);
    },
  };

  getPreviewer(
    _denops: Denops,
    item: DduItem,
    _actionParams: unknown,
  ): Previewer | undefined {
    const action = item.action as ActionData;
    if (!action || !action.path) {
      return undefined;
    }
    return {
      kind: "buffer",
      path: action.path,
      pattern: action.pattern,
    };
  }

  params(): Params {
    return {};
  }
}
