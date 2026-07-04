import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private sesClient: SESClient | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    const accessKeyId = this.configService.get<string>("AWS_ACCESS_KEY_ID");
    const secretAccessKey = this.configService.get<string>("AWS_SECRET_ACCESS_KEY");
    const region = this.configService.get<string>("AWS_REGION") || "us-east-1";

    if (accessKeyId && secretAccessKey) {
      this.sesClient = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log("Amazon SES client initialized successfully.");
    } else {
      this.logger.warn("AWS SES credentials not found. EmailService will run in mock/log mode.");
    }
  }

  /**
   * Sends a branded email using Amazon SES and logs the outcome in the database.
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    restaurantId?: string
  ): Promise<boolean> {
    let senderEmail = "noreply@huespire.digital";
    let senderName = "Restaurant OS";

    // 1. Resolve dynamic branding & sender information
    if (restaurantId) {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
        include: { settings: true },
      });

      if (restaurant) {
        senderName = restaurant.name;
        senderEmail = `noreply@${restaurant.subdomain}.huespire.digital`;
      }
    }

    const fromHeader = `${senderName} <${senderEmail}>`;

    // 2. Initialize log entry
    const emailLog = await this.prisma.emailLog.create({
      data: {
        restaurantId,
        recipient: to,
        sender: fromHeader,
        subject,
        status: "PENDING",
      },
    });

    this.logger.log(`Sending email to ${to} (Subject: "${subject}")`);

    try {
      if (this.sesClient) {
        const command = new SendEmailCommand({
          Source: fromHeader,
          Destination: {
            ToAddresses: [to],
          },
          Message: {
            Subject: {
              Data: subject,
              Charset: "UTF-8",
            },
            Body: {
              Html: {
                Data: html,
                Charset: "UTF-8",
              },
            },
          },
        });

        await this.sesClient.send(command);

        // Update status to DELIVERED
        await this.prisma.emailLog.update({
          where: { id: emailLog.id },
          data: { status: "DELIVERED" },
        });
        return true;
      } else {
        // Fallback log mode for local development
        this.logger.debug("--- [MOCK EMAIL SENT] ---");
        this.logger.debug(`From: ${fromHeader}`);
        this.logger.debug(`To: ${to}`);
        this.logger.debug(`Subject: ${subject}`);
        this.logger.debug("-------------------------");

        await this.prisma.emailLog.update({
          where: { id: emailLog.id },
          data: { status: "DELIVERED" },
        });
        return true;
      }
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
      await this.prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: "FAILED",
          errorMessage: err.message,
        },
      });
      return false;
    }
  }

  /**
   * Retries a failed email attempt
   */
  async retryEmail(logId: string): Promise<boolean> {
    const log = await this.prisma.emailLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      throw new Error("Email log entry not found");
    }

    if (log.status === "DELIVERED") {
      return true;
    }

    // Read the email body (we'll fetch it by calling templates depending on the subject or retry it directly)
    // To ensure the retry sends the exact same HTML, let's look up templates, or send a simplified reminder.
    // For general retries, we can re-route the send command with the logged subject and placeholder html,
    // or store/restore html in future schema designs. For this Phase, we'll re-attempt using the logged values.
    
    // We increment attempts
    await this.prisma.emailLog.update({
      where: { id: logId },
      data: {
        attempts: { increment: 1 },
      },
    });

    // Mock HTML for retry (normally we reconstruct the body)
    const retryHtml = `
      <h2>Retry Transaction Email</h2>
      <p>This is a re-sent attempt of the transactional message: <strong>${log.subject}</strong></p>
    `;

    return this.sendEmail(log.recipient, log.subject, retryHtml, log.restaurantId || undefined);
  }
}
