import { Kafka, Consumer, EachMessagePayload } from "kafkajs";

export interface KafkaConsumerConfig {
    clientId: string;
    brokers: string[];
    groupId: string;
}

export type MessageHandler = (payload: EachMessagePayload) => Promise<void>;

export class KafkaConsumerService {
    private consumer: Consumer;
    private isConnected = false;

    constructor(config: KafkaConsumerConfig) {
        const kafka = new Kafka({
            clientId: config.clientId,
            brokers: config.brokers,
        });
        this.consumer = kafka.consumer({ groupId: config.groupId });
    }

    async connect(): Promise<void> {
        if (this.isConnected) return;
        await this.consumer.connect();
        this.isConnected = true;
        console.log("[KafkaConsumer] Connected to Kafka");
    }

    async disconnect(): Promise<void> {
        if (!this.isConnected) return;
        await this.consumer.disconnect();
        this.isConnected = false;
        console.log("[KafkaConsumer] Disconnected from Kafka");
    }

    async subscribe(topics: string[], fromBeginning = false): Promise<void> {
        if (!this.isConnected) {
            await this.connect();
        }
        for (const topic of topics) {
            await this.consumer.subscribe({ topic, fromBeginning });
            console.log(`[KafkaConsumer] Subscribed to topic "${topic}"`);
        }
    }

    async consume(handler: MessageHandler): Promise<void> {
        await this.consumer.run({
            eachMessage: async (payload) => {
                try {
                    await handler(payload);
                } catch (error) {
                    console.error(
                        `[KafkaConsumer] Error processing message from topic ${payload.topic}:`,
                        error
                    );
                }
            },
        });
    }

    static parseJSON<T = Record<string, unknown>>(value: Buffer | null): T | null {
        if (!value) return null;
        try {
            return JSON.parse(value.toString()) as T;
        } catch (err) {
            console.error("[KafkaConsumer] Failed to parse JSON message value", err);
            return null;
        }
    }
}
