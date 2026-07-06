import dotenv from "dotenv";
dotenv.config();

const requiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

const env = {
  port:     Number(process.env.PORT) || 3001,
  nodeEnv:  process.env.NODE_ENV || "development",

  mongo: {
    uri: requiredEnv("MONGO_URI"),
  },

  jwt: {
    accessSecret:   requiredEnv("JWT_ACCESS_SECRET"),
    refreshSecret:  requiredEnv("JWT_REFRESH_SECRET"),
    accessExpires:  process.env.JWT_ACCESS_EXPIRES  || "15m",
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || "7d",
  },

  redis: {
    url: requiredEnv("REDIS_URL"),
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
  },

  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",

  cors: {
    clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  },
};

export default env;