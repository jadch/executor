import { createPluginAtomClient } from "@executor-js/sdk/client";
import {
  getExecutorApiBaseUrl,
  getExecutorServerAuthorizationHeader,
} from "@executor-js/react/api/server-connection";
import { GoogleDiscoveryGroup } from "../api/group";

export const GoogleDiscoveryClient = createPluginAtomClient(GoogleDiscoveryGroup, {
  baseUrl: getExecutorApiBaseUrl,
  authorizationHeader: getExecutorServerAuthorizationHeader,
});
