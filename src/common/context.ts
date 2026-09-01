import { AsyncLocalStorage } from "node:async_hooks";

type RequestContext = {
  traceId: string;
};

export const requestContext = new AsyncLocalStorage<RequestContext>();
