import { Prisma, PrismaClient } from "@prisma/client";
import { PubSub } from "graphql-subscriptions";
import { Context } from "graphql-ws/lib/server";
import { ISODateString } from "next-auth";
import { conversationPopulated } from "../graphql/resolvers/conversation";

//  server configuration

export interface SubscriptionContext extends Context {
  connectionParams: {
    session?: Session;
  };
}

export interface GraphQLContext {
  session: Session | null;
  prisma: PrismaClient;
  pubsub: PubSub;
}

// users

export interface Session {
  user: User;
  expires: ISODateString;
}

interface User {
  id: string;
  username: string;
  email: string;
  image: string;
  name: string;
  emailVerified: boolean;
}

export interface CreateUsernameResponse {
  success?: boolean;
  error?: string;
}

// @ts-ignore
export type ConversationPopulated = Prisma.ConversationGetPayload<{
  include: typeof conversationPopulated;
}>;
