import { GraphQLContext } from "../../util/types";

export const resolvers = {
  Mutation: {
    createConversation: async (
      _: any,
      args: { participantIds: Array<string> },
      context: GraphQLContext
    ) => {
      console.log(args, "Inside create conversation");
    },
  },
};
