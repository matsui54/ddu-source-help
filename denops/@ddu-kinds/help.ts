import {
  ActionArguments,
  ActionFlags,
  BaseKind,
  DduItem,
  Previewer,
} from "https://deno.land/x/ddu_vim@v2.7.0/types.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v2.7.0/deps.ts";

export type ActionData = {
  word: string;
  path: string;
  pattern: string;
};

type OpenParams = {
  command: string;
};

type Params = Record<never, never>;

export class Kind extends BaseKind<Params> {
  actions: Record<
    string,
    (args: ActionArguments<Params>) => Promise<ActionFlags>
  > = {
    open: async ({
      denops,
      actionParams,
      items,
    }: ActionArguments<Params>) => {
      const params = actionParams as OpenParams;
      // Convert sp[lit], vs[plit] tabe[dit] -> "vertical", "", "tab"
      const openCommand = (params.command ?? "").replace(
        /^vs(?:p(?:l(?:i(?:t)?)?)?)?$/,
        "vertical",
      ).replace(
        /^s(?:p(?:l(?:i(?:t)?)?)?)?$/,
        "",
      ).replace(
        /^tabe(?:d(?:i(?:t?)?)?)?$/,
        "tab",
      );

      const action = items[0]?.action as ActionData;
      await denops.cmd(`silent ${openCommand} help ${action.word}`);
      return Promise.resolve(ActionFlags.None);
    },
    vsplit: (args: ActionArguments<Params>) => {
      return this.actions["open"]({
        ...args,
        actionParams: { command: "vertical" },
      });
    },
    tabopen: (args: ActionArguments<Params>) => {
      return this.actions["open"]({
        ...args,
        actionParams: { command: "tab" },
      });
    },
  };

  getPreviewer(args: {
    item: DduItem;
  }): Promise<Previewer | undefined> {
    const action = args.item.action as ActionData;
    if (!action || !action.path) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve({
      kind: "buffer",
      path: action.path,
      pattern: action.pattern,
      syntax: "help",
    });
  }

  params(): Params {
    return {};
  }
}
