const { ApolloServer, gql } = require('apollo-server');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();
const bcrypt = require('bcryptjs');

const { DB_URI, DB_NAME } = process.env;

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = gql`
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  # This "User" type defines the queryable fields for every user in our data source.
  type User {
    id: ID!
    name: String!
    email: String!
    avatar: String
  }

  type Project {
    id: ID!
    createdAt: String!
    title: String!
    progress: Float!
    users: [User!]!
    todos: [ToDo!]!
  }

  type ToDo {
    id: ID!
    content: String!
    isCompleted: Boolean!
    project: Project!
  }

  input SignUpInput {
    email: String!
    password: String!
    name: String!
    avatar: String
  }

  input SignInInput {
    email: String!
    password: String!    
  }

  type AuthUser {
    user: User!
    token: String!
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    myProjects: [Project!]!
  }

  type Mutation {
    signUp(input: SignUpInput!): AuthUser!
    signIn(input: SignInInput!): AuthUser!
  }
`;

// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
const resolvers = {
  Query: {
    myProjects: () => []
  },
  Mutation: {
    signUp: async (_, { input }, { db }) => {
      // console.log('input', input);
      const hashedPassword = bcrypt.hashSync(input.password);
      const newUser = { ...input, password: hashedPassword };
      const result = await db.collection('Users').insertOne(newUser);
      // const userId = result.insertedId.valueOf().toString();
      // console.log('result', result);
      // console.log('userId', userId);
      return {
        user: { id: result.insertedId, name: input.name },
        token: 'token'
      };
    },
    signIn: async (_, { input }, { db }) => {
      // console.log('input', input);
      const user = await db.collection('Users').findOne({ email: input.email });
      console.log('user', user);
      // check if user exists in db
      if (!user) {
        throw new Error('Invalid credentials');
      }
      // check if password is correct
      const isPasswordCorrect = bcrypt.compareSync(input.password, user.password);
      if (!isPasswordCorrect) {
        throw new Error('Invalid credentials');
      }

      return {
        user: {...user, id: user._id},
        token: 'token'
      }
    }
  },
};

const start = async () => {
  const client = new MongoClient(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const db = client.db(DB_NAME);

  const context = {
    db, 
  }
  // The ApolloServer constructor requires two parameters: your schema
  // definition and your set of resolvers.
  const server = new ApolloServer({ typeDefs, resolvers, context });

  // The `listen` method launches a web server.
  server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
}

start();
