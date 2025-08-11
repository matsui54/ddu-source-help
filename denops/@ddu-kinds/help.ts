import {
  ActionArguments,
  ActionFlags,
  DduItem,
  Previewer,
} from "jsr:@shougo/ddu-vim@~10.4.0/types";
import { BaseKind } from "jsr:@shougo/ddu-vim@~10.4.0/kind";

export type ActionData = {
  word: string;
  path: string;
  pattern: string;
};

type OpenParams = {
  command: string;
};

type Params = {
  histadd: boolean;
};

export class Kind extends BaseKind<Params> {
  actions: Record<
    string,
    (args: ActionArguments<Params>) => Promise<ActionFlags>
  > = {
    open: async ({
      denops,
      actionParams,
      items,
      kindParams,
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
      const command = `${openCommand} help ${action.word}`;

      if (kindParams.histadd) {
        await denops.call("histadd", "cmd", command.replace(/^\s+/, ""));
      }

      await denops.cmd(`silent! ${command}`);
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

  override getPreviewer(args: {
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
    return {
      histadd: false,
    };
  }
}
