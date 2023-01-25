import { resolvers as userResolvers } from "./user";
import { resolvers as conversationResolvers } from "./conversation";
import merge from "lodash.merge";

export const resolvers = merge({}, userResolvers, conversationResolvers);
