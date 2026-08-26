import { Resend } from "resend";
import { RESEND_API_KEY } from "../../../common/config/env";

export const resendClient = new Resend(RESEND_API_KEY);
