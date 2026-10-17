/** Local process entry point; implementation belongs to the agent runtime layer. */
import { app } from "./runtime/server";
import { config, provider } from "./config";

app.listen(config.port, config.host, () =>
  console.log(
    `SportsBuilder agent ready at http://${config.host}:${config.port} (${provider()}, ${config.model}, ${config.reasoning} reasoning)`,
  ),
);
