import { Prisma } from "@prisma/client";
import { ApolloError } from "apollo-server-core";
import { ConversationPopulated, GraphQLContext } from "../../util/types";

export const resolvers = {
  Query: {
    conversations: async (
      _: any,
      __: any,
      context: GraphQLContext
    ): Promise<Array<ConversationPopulated>> => {
      const { session, prisma } = context;

      if (!session?.user) {
        throw new ApolloError("Not authorized");
      }

      const {
        user: { id: userId },
      } = session;

      try {
        const conversations = await prisma.conversation.findMany({
          // below is how we should get conversations for the logged in user
          // there is an open pr for prisma mongo adapter
          // TODO: Link the pr #

          // where: {
          //   participants: {
          //     some: {
          //       userId: {
          //         equals: userId,
          //       },
          //     },
          //   },
          // },
          include: conversationPopulated,
        });

        // alternatively we will filter conversations for this user

        return conversations.filter(
          (conversation) =>
            !!conversation.participants.find((p) => p.userId === userId)
        );
      } catch (error: any) {
        console.log("Conversations error", error);
        throw new ApolloError(error?.message);
      }
    },
  },
  Mutation: {
    createConversation: async (
      _: any,
      args: { participantIds: Array<string> },
      context: GraphQLContext
    ): Promise<{ conversationId: string }> => {
      console.log(args, "Inside create conversation");
      const { participantIds } = args;
      const { session, prisma } = context;

      if (!session?.user) {
        throw new ApolloError("Not authorized");
      }

      const {
        user: { id: userId },
      } = session;

      try {
        // @ts-ignore
        const conversation = await prisma.conversation.create({
          data: {
            participants: {
              createMany: {
                data: participantIds.map((id) => ({
                  userId: id,
                  hasSeenLatestMessage: id === userId ? true : false,
                })),
              },
            },
          },
          include: conversationPopulated,
        });

        // Emit a CONVERSATION_CREATED event using pub sub

        return { conversationId: conversation.id };
      } catch (error) {
        console.log("create conversations error");
        throw new ApolloError("Error creating conversation");
      }
    },
  },
};

export const participantPopulated =
  // @ts-ignore
  Prisma.validator()<Prisma.ConversationParticipantInclude>({
    // @ts-ignore
    user: {
      select: {
        id: true,
        username: true,
      },
    },
  });

export const conversationPopulated =
  // @ts-ignore
  Prisma.validator<Prisma.ConversationInclude>()({
    participants: {
      include: participantPopulated,
    },
    latestMessage: {
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    },
  });
