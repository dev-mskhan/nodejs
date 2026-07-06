import dotenv from "dotenv";
import { KafkaConsumerService } from "@workspace/shared";
import { emailService } from "./services/email.service.js";

dotenv.config();

const brokers = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");
const consumer = new KafkaConsumerService({
    clientId: "notifications-service",
    brokers,
    groupId: "notifications-group",
});

const startNotificationsService = async () => {
    console.log("[Notifications Service] Starting consumer...");

    await consumer.connect();
    await consumer.subscribe(["email-events"]);

    await consumer.consume(async ({ topic, partition, message }) => {
        console.log(`[Notifications Service] Message received from topic "${topic}" (partition ${partition})`);

        const event = KafkaConsumerService.parseJSON<{
            type: string;
            to: string;
            subject: string;
            html: string;
        }>(message.value);

        if (!event) {
            console.error("[Notifications Service] Null or invalid message value, ignoring");
            return;
        }

        const { to, subject, html } = event;
        if (!to || !subject || !html) {
            console.error("[Notifications Service] Missing required fields in email event:", event);
            return;
        }

        try {
            console.log(`[Notifications Service] Processing "${event.type}" email event for ${to}...`);
            await emailService.sendEmail({ to, subject, html });
            console.log(`[Notifications Service] Email successfully processed for ${to}`);
        } catch (err) {
            console.error(`[Notifications Service] Failed to send email to ${to}:`, err);
        }
    });

    console.log("[Notifications Service] Running and listening for Kafka events");
};

// Handle graceful shutdown
const shutdown = async () => {
    console.log("[Notifications Service] Shutting down cleanly...");
    await consumer.disconnect();
    process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startNotificationsService().catch((err) => {
    console.error("[Notifications Service] Failed to start:", err);
    process.exit(1);
});
