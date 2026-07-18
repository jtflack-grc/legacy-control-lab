import type { CommandDefinition } from "./commandCatalog.js";
import type { IbmiSession } from "./sessionService.js";
import type { ParsedCommand } from "./commandParser.js";
import { listRowsForCatalogCommand } from "./catalogDataProviders.js";
import { createCatalogCommandScreen, catalogVerbFamily } from "../screen-runtime/screens/catalogCommandScreens.js";
import { createDepthDisplayScreen } from "./catalogDisplayEngine.js";
import { isCatalogMutatingCommand, tryExecuteCatalogMutation } from "./catalogMutationEngine.js";
import type { CommandHandler } from "./commandHandlers.js";

export { isCatalogMutatingCommand } from "./catalogMutationEngine.js";

function makeCatalogHandler(): CommandHandler {
  return (session, parsed, definition) => {
    const mutation = tryExecuteCatalogMutation(session, definition, parsed);
    if (mutation) return mutation;

    const catalogDefinition = {
      ...definition,
      category: definition.category,
      displayName: definition.displayName,
      status: definition.status,
    };

    const family = catalogVerbFamily(definition.name);
    const screen =
      family === "display"
        ? createDepthDisplayScreen(catalogDefinition, session, parsed)
        : createCatalogCommandScreen(catalogDefinition, session, parsed);

    if (family === "work") {
      session.catalogWorkContext = {
        screenId: definition.name,
        rows: listRowsForCatalogCommand(catalogDefinition, session),
      };
    }
    return { kind: "screen", screen };
  };
}

const catalogHandler = makeCatalogHandler();

export const catalogCommandHandlers: Record<string, CommandHandler> = {
  catalogWorkWith: catalogHandler,
  catalogDisplay: catalogHandler,
  catalogChange: catalogHandler,
  catalogCreate: catalogHandler,
  catalogDelete: catalogHandler,
  catalogAction: catalogHandler,
  catalogControl: catalogHandler,
  catalogBackup: catalogHandler,
  catalogNetwork: catalogHandler,
  catalogCommand: catalogHandler,
};

export function handlerNameForCatalogCommand(commandName: string): string {
  const family = catalogVerbFamily(commandName);
  switch (family) {
    case "work":
      return "catalogWorkWith";
    case "display":
      return "catalogDisplay";
    case "change":
      return "catalogChange";
    case "create":
      return "catalogCreate";
    case "delete":
      return "catalogDelete";
    case "control":
      return "catalogControl";
    case "backup":
      return "catalogBackup";
    case "network":
      return "catalogNetwork";
    case "action":
      return "catalogAction";
    default:
      return "catalogCommand";
  }
}
