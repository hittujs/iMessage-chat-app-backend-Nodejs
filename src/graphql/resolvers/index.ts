import { resolvers as userResolvers } from "./user";
import { resolvers as conversationResolvers } from "./conversation";
import { resolvers as messageResolvers } from "./message";
import scalarResolvers from "./scalars";
import merge from "lodash.merge";

export const resolvers = merge(
  {},
  userResolvers,
  conversationResolvers,
  messageResolvers,
  scalarResolvers
);
