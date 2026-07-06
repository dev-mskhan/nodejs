import { Kafka } from "kafkajs";

const kafka = new Kafka({
    clientId: "crypto-tracker-service",
    brokers: ["localhost:9092"],
});
