import { resendClient } from "./infra/resend.client";
import { RESEND_FROM } from "../../common/config/env";
import { logger } from "../../common/logger";
import { SendEmailInput, SendEmailResult } from "./types/email.types";

export async function sendEmail(
  data: SendEmailInput,
): Promise<SendEmailResult | null> {
  const { data: sent, error } = await resendClient.emails.send({
    from: RESEND_FROM,
    to: data.to,
    subject: data.subject,
    text: data.text,
  });

  if (error || !sent) {
    logger.error({ err: error }, "Resend rechazó el envío");
    return null;
  }

  logger.info({ emailId: sent.id }, "Correo enviado");
  return { id: sent.id };
}