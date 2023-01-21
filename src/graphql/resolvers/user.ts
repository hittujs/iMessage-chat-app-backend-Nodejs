import { CreateUsernameResponse, GraphQLContext } from "../../util/types";

export const resolvers = {
  Query: {
    searchUsers: () => {},
  },
  Mutation: {
    createUsername: async (
      _: any,
      args: { username: string },
      context: GraphQLContext
    ) => {
      const { username } = args;
      const { session, prisma } = context;

      if (!session?.user) {
        return {
          error: "Not Authorized",
        };
      }

      const { id: userId } = session.user;

      try {
        //  check if username is not taken

        const existingUser = await prisma.user.findUnique({
          where: {
            username,
          },
        });

        // if user name is taken

        if (existingUser) {
          return { error: "username already taken, try another" };
        }
        await prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            username,
          },
        });
        return { success: true };
      } catch (error: any) {
        console.log("Create user name error", error);
        return {
          error: error?.messages,
        };
      }
    },
  },
};
