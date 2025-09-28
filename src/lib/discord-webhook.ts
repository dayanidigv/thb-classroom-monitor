interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
  };
  timestamp?: string;
}

interface DiscordWebhookPayload {
  username?: string;
  avatar_url?: string;
  content?: string;
  embeds?: DiscordEmbed[];
}

class DiscordWebhook {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = 'https://discord.com/api/webhooks/1421746997509099650/oNTvE6nlamDVnnsMCBztE7vU1YTfuF0bLCY9ZoQt-uYjNCjLFu9sBA-E7miCuEgPAsSJ';
  }

  async sendMessage(payload: DiscordWebhookPayload): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('Failed to send Discord webhook:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending Discord webhook:', error);
    }
  }

  async logLogin(userInfo: {
    name: string;
    email: string;
    role: string;
    loginMethod: 'google' | 'manual';
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const embed: DiscordEmbed = {
      title: '🔐 User Login',
      color: 0x00ff00, // Green color
      fields: [
        {
          name: '👤 User',
          value: userInfo.name,
          inline: true,
        },
        {
          name: '📧 Email',
          value: userInfo.email,
          inline: true,
        },
        {
          name: '🎭 Role',
          value: userInfo.role.toUpperCase(),
          inline: true,
        },
        {
          name: '🔑 Login Method',
          value: userInfo.loginMethod === 'google' ? 'Google OAuth' : 'Manual Login',
          inline: true,
        },
        {
          name: '🌐 IP Address',
          value: userInfo.ipAddress || 'Unknown',
          inline: true,
        },
        {
          name: '💻 User Agent',
          value: userInfo.userAgent ? userInfo.userAgent.substring(0, 100) + '...' : 'Unknown',
          inline: false,
        },
      ],
      footer: {
        text: 'THB Talent Development - Login Activity',
      },
      timestamp: new Date().toISOString(),
    };

    await this.sendMessage({
      username: 'THB Security Monitor',
      avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
      embeds: [embed],
    });
  }

  async logPublicAccess(visitorInfo: {
    studentName?: string;
    studentId?: string;
    accessedBy?: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
  }): Promise<void> {

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

    if (visitorInfo.studentName) {
      fields.push({
        name: '🎓 Student',
        value: visitorInfo.studentName,
        inline: true,
      });
    }

    if (visitorInfo.studentId) {
      fields.push({
        name: '🆔 Student ID',
        value: visitorInfo.studentId,
        inline: true,
      });
    }

    if (visitorInfo.accessedBy) {
      fields.push({
        name: '👤 Accessed By',
        value: visitorInfo.accessedBy,
        inline: true,
      });
    }

    fields.push(
      {
        name: '🌐 IP Address',
        value: visitorInfo.ipAddress || 'Unknown',
        inline: true,
      },
      {
        name: '📱 Access Type',
        value: 'PUBLIC ACCESS',
        inline: true,
      }
    );

    if (visitorInfo.referrer) {
      fields.push({
        name: '🔗 Referrer',
        value: visitorInfo.referrer.substring(0, 100) + (visitorInfo.referrer.length > 100 ? '...' : ''),
        inline: false,
      });
    }

    if (visitorInfo.userAgent) {
      fields.push({
        name: '💻 User Agent',
        value: visitorInfo.userAgent.substring(0, 100) + '...',
        inline: false,
      });
    }

    const embed: DiscordEmbed = {
      title: '🌐 Public Profile Access',
      color: 0x9900ff, // Purple
      fields,
      footer: {
        text: 'THB Talent Development - Public Access Monitor',
      },
      timestamp: new Date().toISOString(),
    };

    await this.sendMessage({
      username: 'THB Public Access Monitor',
      avatar_url: 'https://cdn.discordapp.com/embed/avatars/1.png',
      embeds: [embed],
    });
  }

  async logError(errorInfo: {
    type: string;
    message: string;
    user?: string;
    page?: string;
    ipAddress?: string;
  }): Promise<void> {
    const embed: DiscordEmbed = {
      title: '🚨 System Error',
      color: 0xff0000, // Red color
      fields: [
        {
          name: '⚠️ Error Type',
          value: errorInfo.type,
          inline: true,
        },
        {
          name: '📝 Message',
          value: errorInfo.message.substring(0, 200) + (errorInfo.message.length > 200 ? '...' : ''),
          inline: false,
        },
      ],
      footer: {
        text: 'THB Talent Development - Error Monitor',
      },
      timestamp: new Date().toISOString(),
    };

    if (errorInfo.user) {
      embed.fields!.push({
        name: '👤 User',
        value: errorInfo.user,
        inline: true,
      });
    }

    if (errorInfo.page) {
      embed.fields!.push({
        name: '📄 Page',
        value: errorInfo.page,
        inline: true,
      });
    }

    if (errorInfo.ipAddress) {
      embed.fields!.push({
        name: '🌐 IP Address',
        value: errorInfo.ipAddress,
        inline: true,
      });
    }

    await this.sendMessage({
      username: 'THB Error Monitor',
      avatar_url: 'https://cdn.discordapp.com/embed/avatars/2.png',
      embeds: [embed],
    });
  }
}

export const discordWebhook = new DiscordWebhook();