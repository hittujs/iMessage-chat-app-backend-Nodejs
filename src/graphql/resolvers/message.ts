import { Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";
import {
  GraphQLContext,
  MessagePopulated,
  MessageSentSubscriptionPayload,
  SendMessageArgs,
} from "../../util/types";
import { isConversationParticipant } from "../../util/functions";
import { conversationPopulated } from "./conversation";

export const resolvers = {
  Query: {
    messages: async (
      _: any,
      args: { conversationId: string },
      context: GraphQLContext
    ): Promise<Array<MessagePopulated>> => {
      const { session, prisma } = context;
      const { conversationId } = args;

      if (!session?.user) {
        throw new GraphQLError("Not Authorized");
      }

      const {
        user: { id: userId },
      } = session;

      //   Verify that conversation exists and user is participant
      //   @ts-ignore
      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
        include: conversationPopulated,
      });

      if (!conversation) {
        throw new GraphQLError("Conversation not found");
      }

      const allowedToView = isConversationParticipant(
        conversation.participants,
        userId
      );

      if (!allowedToView) {
        throw new GraphQLError("Not authorized");
      }

      try {
        // @ts-ignore
        const messages = await prisma.message.findMany({
          where: {
            conversationId,
          },
          include: messagePopulated,
          orderBy: {
            createdAt: "desc",
          },
        });
        return messages;
      } catch (error: any) {
        throw new GraphQLError(error?.message);
      }
    },
  },
  Mutation: {
    sendMessage: async (
      _: any,
      args: SendMessageArgs,
      context: GraphQLContext
    ): Promise<boolean> => {
      const { session, prisma, pubsub } = context;
      const { id: messageId, senderId, conversationId, body } = args;

      if (!session?.user) {
        throw new GraphQLError("Not Authorized");
      }
      const { id: userId } = session?.user;

      if (userId !== senderId) {
        throw new GraphQLError("Not Authorized");
      }

      try {
        //  create new message entity
        // @ts-ignore
        const newMessage = await prisma.message.create({
          data: {
            id: messageId,
            senderId,
            conversationId,
            body,
          },
          include: messagePopulated,
        });

        // Find conversation participant entity

        const conversationParticipantId =
          // @ts-ignore
          await prisma.conversationParticipant.findFirst({
            where: {
              userId,
              conversationId,
            },
          });

        if (!conversationParticipantId) {
          throw new GraphQLError("Conversation not found");
        }
        // update conversation entity

        //  @ts-ignore
        const conversation = await prisma.conversation.update({
          where: {
            id: conversationId,
          },
          data: {
            latestMessageId: newMessage.id,
            participants: {
              update: {
                where: {
                  id: conversationParticipantId.id,
                },
                data: {
                  hasSeenLatestMessage: true, // marking read true for sender
                },
              },
              updateMany: {
                where: {
                  NOT: {
                    userId: senderId,
                  },
                },
                data: {
                  hasSeenLatestMessage: false, // marking read false for all other in conversation
                },
              },
            },
          },
        });

        // publish subscriptions

        pubsub.publish("MESSAGE_SENT", { messageSent: newMessage });
        // pubsub.publish("CONVERSATION_UPDATED", {
        //   conversationUpdated: { conversation },
        // });
      } catch (error: any) {
        console.log("Send message error", error);
        throw new GraphQLError("Error sending message");
      }

      return true;
    },
  },
  Subscription: {
    messageSent: {
      subscribe: withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const { pubsub } = context;
          return pubsub.asyncIterator(["MESSAGE_SENT"]);
        },
        (
          payload: MessageSentSubscriptionPayload,
          args: { conversationId: string },
          context: GraphQLContext
        ) => {
          return payload.messageSent.conversationId === args.conversationId;
        }
      ),
    },
  },
};

// @ts-ignore
export const messagePopulated = Prisma.validator<Prisma.MessageInclude>()({
  sender: {
    select: {
      id: true,
      username: true,
    },
  },
});
