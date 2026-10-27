import { deliverQuoteEmails } from "../utils/quote-email-delivery";

export default defineTask({
  meta: { name: "quote-emails", description: "Send pending quote confirmations and retry transient email failures" },
  async run() {
    return { result: await deliverQuoteEmails(process.env.RESEND_API_KEY) };
  },
});
