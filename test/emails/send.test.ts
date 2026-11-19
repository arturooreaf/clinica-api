jest.mock("../../src/common/middlewares/rateLimit.middleware", () =>
  jest.requireActual("../mocks").passThroughLimiters(),
);
jest.mock("../../src/modules/email/infra/resend.client", () =>
  jest.requireActual("../mocks").resendClientMock(),
);

import { resendClient } from "../../src/modules/email/infra/resend.client";
import { api, signedInAs } from "../helpers";

const send = jest.mocked(resendClient.emails.send);

const anEmail = {
  to: "delivered@resend.dev",
  subject: "Your appointment is confirmed",
  text: "See you on Monday at 9:30.",
};

// What Resend answers when it accepts or rejects an email.
const accepted = (id: string) =>
  ({ data: { id }, error: null, headers: null }) as Awaited<
    ReturnType<typeof send>
  >;
const rejected = () =>
  ({
    data: null,
    error: {
      name: "validation_error",
      message: "Invalid `to` field",
      statusCode: 422,
    },
    headers: null,
  }) as unknown as Awaited<ReturnType<typeof send>>;

describe("POST /emails", () => {
  it("sends the email and answers 202 with its id", async () => {
    send.mockResolvedValue(accepted("re_123"));

    const response = await api()
      .post("/emails")
      .set(signedInAs())
      .send(anEmail);

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ id: "re_123" });
  });

  it("sends it from the configured sender, with what the client wrote", async () => {
    send.mockResolvedValue(accepted("re_123"));

    await api().post("/emails").set(signedInAs()).send(anEmail);

    expect(send).toHaveBeenCalledWith({
      from: "Clinica Test <no-reply@example.com>",
      ...anEmail,
    });
  });

  it("ignores a from address sent by the client", async () => {
    send.mockResolvedValue(accepted("re_123"));

    await api()
      .post("/emails")
      .set(signedInAs())
      .send({ ...anEmail, from: "ceo@bank.example" });

    expect(send.mock.calls[0]![0].from).toBe(
      "Clinica Test <no-reply@example.com>",
    );
  });

  it("answers 502 when Resend rejects the email", async () => {
    send.mockResolvedValue(rejected());

    const response = await api()
      .post("/emails")
      .set(signedInAs())
      .send(anEmail);

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: "Could not send email" });
  });

  it("answers 500 when Resend cannot be reached", async () => {
    send.mockRejectedValue(new Error("getaddrinfo ENOTFOUND api.resend.com"));

    const response = await api()
      .post("/emails")
      .set(signedInAs())
      .send(anEmail);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Error sending email" });
  });

  it.each([
    ["no body", {}, "Invalid data"],
    ["a subject that is a number", { ...anEmail, subject: 1 }, "Invalid data"],
    ["an empty text", { ...anEmail, text: "" }, "Fields cannot be empty"],
    [
      "a subject made of spaces",
      { ...anEmail, subject: "   " },
      "Fields cannot be empty",
    ],
    [
      "a recipient without @",
      { ...anEmail, to: "not-an-email" },
      "Recipient is not a valid email",
    ],
  ])(
    "answers 400 for %s, without sending anything",
    async (_case, body, error) => {
      const response = await api().post("/emails").set(signedInAs()).send(body);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error });
      expect(send).not.toHaveBeenCalled();
    },
  );

  it("refuses a request without a token, without sending anything", async () => {
    const response = await api().post("/emails").send(anEmail);

    expect(response.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });
});
