import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { expressMiddleware } from "@apollo/server/express4";
// version 3 imports
// import { ApolloServer } from "apollo-server-express";
// import {
//   ApolloServerPluginDrainHttpServer,
//   ApolloServerPluginLandingPageLocalDefault,
// } from "apollo-server-core";
import { makeExecutableSchema } from "@graphql-tools/schema";
import * as dotenv from "dotenv";
import { getSession } from "next-auth/react";
import { typeDefs } from "./graphql/typeDefs";
import { resolvers } from "./graphql/resolvers";
import { useServer } from "graphql-ws/lib/use/ws";
import { PrismaClient } from "@prisma/client";
import { WebSocketServer } from "ws";
import { PubSub } from "graphql-subscriptions";
import express from "express";
import http from "http";
import cors from "cors";
import { json } from "body-parser";
import { GraphQLContext, Session, SubscriptionContext } from "./util/types";

async function main() {
  dotenv.config();
  const app = express();
  const httpServer = http.createServer(app);

  const prisma = new PrismaClient();
  const pubsub = new PubSub();

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql/subscriptions",
  });

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx: SubscriptionContext): Promise<GraphQLContext> => {
        if (ctx.connectionParams && ctx.connectionParams.session) {
          const { session } = ctx.connectionParams;
          return { session, prisma, pubsub };
        }
        return { session: null, prisma, pubsub };
      },
    },
    wsServer
  );

  const server = new ApolloServer({
    schema,
    csrfPrevention: true,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });
  await server.start();

  const corsOptions = {
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  };

  app.use(
    "/graphql",
    cors<cors.CorsRequest>(corsOptions),
    json(),
    expressMiddleware(server, {
      context: async ({ req }): Promise<GraphQLContext> => {
        const session = await getSession({ req });

        return { session: session as Session, prisma, pubsub };
      },
    })
  );

  const PORT = 4000;

  await new Promise<void>((resolve) =>
    httpServer.listen({ port: PORT }, resolve)
  );
  console.log("Server is listening at 4000");
}

main().catch((error) => console.log(error));
