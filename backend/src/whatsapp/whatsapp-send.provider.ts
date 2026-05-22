import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type WhatsAppSendResult = {
  mode: 'meta' | 'simulated';
  providerMessageId?: string;
};

@Injectable()
export class WhatsAppSendProvider {
  private readonly logger = new Logger(WhatsAppSendProvider.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('WHATSAPP_ACCESS_TOKEN') &&
        this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID'),
    );
  }

  async sendMessage(
    recipientPhone: string,
    content: string,
  ): Promise<WhatsAppSendResult> {
    if (!this.isConfigured()) {
      this.logger.debug(
        { phone: recipientPhone, contentLength: content.length },
        'Simulated WhatsApp send (configure WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID)',
      );
      return { mode: 'simulated' };
    }

    const version =
      this.config.get<string>('WHATSAPP_API_VERSION') ?? 'v21.0';
    const phoneNumberId = this.config.getOrThrow<string>(
      'WHATSAPP_PHONE_NUMBER_ID',
    );
    const token = this.config.getOrThrow<string>('WHATSAPP_ACCESS_TOKEN');
    const to = recipientPhone.replace(/\D/g, '');

    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: content },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `WhatsApp API ${res.status}: ${errText.slice(0, 500)}`,
      );
    }

    const data = (await res.json()) as {
      messages?: Array<{ id?: string }>;
    };
    return {
      mode: 'meta',
      providerMessageId: data.messages?.[0]?.id,
    };
  }
}
