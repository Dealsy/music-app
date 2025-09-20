/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as collectionItems from "../collectionItems.js";
import type * as collections from "../collections.js";
import type * as oauth from "../oauth.js";
import type * as products from "../products.js";
import type * as sessions from "../sessions.js";
import type * as spotifyTokens from "../spotifyTokens.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  collectionItems: typeof collectionItems;
  collections: typeof collections;
  oauth: typeof oauth;
  products: typeof products;
  sessions: typeof sessions;
  spotifyTokens: typeof spotifyTokens;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
