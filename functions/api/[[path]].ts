import { handleRequest, type Env } from '../../server/api';
export const onRequest: PagesFunction<Env> = context => handleRequest(context.request, context.env, context);
