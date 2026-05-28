import * as AtomHttpApi from "effect/unstable/reactivity/AtomHttpApi";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/unstable/http";
import { addGroup } from "@executor-js/api";
import {
  getExecutorApiBaseUrl,
  getExecutorServerAuthorizationHeader,
} from "@executor-js/react/api/server-connection";
import { CloudAuthApi } from "../auth/api";
import { OrgApi } from "../org/api";

// ---------------------------------------------------------------------------
// Cloud API client — core API + cloud auth + org
// ---------------------------------------------------------------------------

const CloudApi = addGroup(CloudAuthApi).add(OrgApi);
const CloudApiClient = AtomHttpApi.Service<"CloudApiClient">()("CloudApiClient", {
  api: CloudApi,
  httpClient: FetchHttpClient.layer,
  transformClient: HttpClient.mapRequest((request) => {
    let next = HttpClientRequest.prependUrl(request, getExecutorApiBaseUrl());
    const authorization = getExecutorServerAuthorizationHeader();
    if (authorization) {
      next = HttpClientRequest.setHeader(next, "authorization", authorization);
    }
    return next;
  }),
});

export { CloudApiClient };
