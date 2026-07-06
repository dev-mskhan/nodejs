import gql from "graphql-tag";

export const typeDefs = gql`
    type User {
        id: ID!
        name: String!
        email: String!
        role: String!
        isVerified: Boolean!
        isBanned: Boolean!
        createdAt: String!
        updatedAt: String!
    }

    type AuthResponse {
        success: Boolean!
        message: String!
        user: User
    }

    type CommonResponse {
        success: Boolean!
        message: String!
    }

    type Query {
        me: User
    }

    type Mutation {
        signup(name: String!, email: String!, password: String!): CommonResponse!
        verifyEmail(token: String!): AuthResponse!
        login(email: String!, password: String!): AuthResponse!
        refreshToken: CommonResponse!
        logout: CommonResponse!
        forgotPassword(email: String!): CommonResponse!
        resetPassword(password: String!, token: String!): CommonResponse!
    }
`;
