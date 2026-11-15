/** Email foundation contracts. No provider or network client is instantiated here. */
export type EmailEnvironment = "development" | "test" | "production";

export type EmailMessage = Readonly<{
  to: string;
  subject: string;
  text: string;
  html: string;
}>;

export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}

export type EmailAction = Readonly<{
  to: string;
  actionUrl: string;
}>;

export type EmailPolicy = Readonly<{
  trustedOrigin: string;
  environment: EmailEnvironment;
}>;

export type EmailServiceOptions = EmailPolicy &
  Readonly<{
    /** No provider is selected, nor is delivery enabled, unless injected explicitly. */
    transport?: EmailTransport;
    deliveryEnabled?: boolean;
  }>;
