import { KafkaProducerService } from "@workspace/shared";
import env from "./env.js";

const emailProducer = new KafkaProducerService("auth-service", env.kafka.brokers);

export { emailProducer };

export const KAFKA_TOPICS = {
    EMAIL_EVENTS: "email-events",
    USER_EVENTS: "user-events",
} as const;
