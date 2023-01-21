import { resolvers as userResolvers } from "./user";
import merge from "lodash.merge";

export const resolvers = merge({}, userResolvers);
