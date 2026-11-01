import { cleanup, handleRequest, type Env } from './api';
export default {
  fetch: handleRequest,
  async scheduled(_event: ScheduledController, env: Env) { await cleanup(env); },
} satisfies ExportedHandler<Env>;
