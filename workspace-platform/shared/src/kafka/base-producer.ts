import { Kafka, Producer, Message, ProducerRecord } from "kafkajs";

export class KafkaProducerService {
    private producer: Producer;
    private isConnected = false;

    constructor(clientId: string, brokers: string[]) {
        const kafka = new Kafka({ clientId, brokers });
        this.producer = kafka.producer();
    }

    async connect(): Promise<void> {
        if (this.isConnected) return;
        await this.producer.connect();
        this.isConnected = true;
        console.log("[KafkaProducer] Connected to Kafka");
    }

    async disconnect(): Promise<void> {
        if (!this.isConnected) return;
        await this.producer.disconnect();
        this.isConnected = false;
        console.log("[KafkaProducer] Disconnected from Kafka");
    }

    async send(topic: string, messages: Message[]): Promise<void> {
        if (!this.isConnected) {
            await this.connect();
        }
        const record: ProducerRecord = { topic, messages };
        await this.producer.send(record);
        console.log(`[KafkaProducer] Sent ${messages.length} message(s) to topic "${topic}"`);
    }

    async sendJSON(topic: string, key: string, data: Record<string, unknown>): Promise<void> {
        await this.send(topic, [
            {
                key,
                value: JSON.stringify(data),
                headers: { "content-type": "application/json" },
            },
        ]);
    }
}
