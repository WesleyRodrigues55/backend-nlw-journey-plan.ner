"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/routes/create-trip.ts
var create_trip_exports = {};
__export(create_trip_exports, {
  createTrip: () => createTrip
});
module.exports = __toCommonJS(create_trip_exports);
var import_zod2 = require("zod");

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient({
  log: ["query"]
});

// src/routes/create-trip.ts
var import_nodemailer2 = __toESM(require("nodemailer"));

// src/lib/mail.ts
var import_nodemailer = __toESM(require("nodemailer"));
async function getMailClient() {
  const account = await import_nodemailer.default.createTestAccount();
  const transporter = import_nodemailer.default.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: account.user,
      pass: account.pass
    }
  });
  return transporter;
}

// src/lib/dayjs.ts
var import_dayjs = __toESM(require("dayjs"));
var import_localizedFormat = __toESM(require("dayjs/plugin/localizedFormat"));
var import_pt_br = require("dayjs/locale/pt-br");
import_dayjs.default.locale("pt-br");
import_dayjs.default.extend(import_localizedFormat.default);

// src/errors/client-error.ts
var ClientError = class extends Error {
};

// src/env.ts
var import_zod = require("zod");
var envSchema = import_zod.z.object({
  DATABASE_URL: import_zod.z.string().url(),
  API_BASE_URL: import_zod.z.string().url(),
  WEB_BASE_URL: import_zod.z.string().url(),
  PORT: import_zod.z.coerce.number().default(3333)
});
var env = envSchema.parse(process.env);

// src/routes/create-trip.ts
async function createTrip(app) {
  app.withTypeProvider().post("/trips", {
    schema: {
      body: import_zod2.z.object({
        destination: import_zod2.z.string().min(4),
        starts_at: import_zod2.z.coerce.date(),
        ends_at: import_zod2.z.coerce.date(),
        owner_name: import_zod2.z.string(),
        owner_email: import_zod2.z.string().email(),
        emails_to_invite: import_zod2.z.array(import_zod2.z.string().email())
      })
    }
  }, async (request) => {
    const { destination, starts_at, ends_at, owner_name, owner_email, emails_to_invite } = request.body;
    if ((0, import_dayjs.default)(starts_at).isBefore(/* @__PURE__ */ new Date())) {
      throw new ClientError("Invalid trip start date");
    }
    if ((0, import_dayjs.default)(ends_at).isBefore(starts_at)) {
      throw new ClientError("Invalid trip end date");
    }
    const trip = await prisma.trip.create({
      data: {
        destination,
        starts_at,
        ends_at,
        participants: {
          createMany: {
            data: [
              {
                name: owner_name,
                email: owner_email,
                is_owner: true,
                is_confirmed: true
              },
              ...emails_to_invite.map((email) => {
                return { email };
              })
            ]
          }
        }
      }
    });
    const formattedStartDate = (0, import_dayjs.default)(starts_at).format("LL");
    const formattedEndDate = (0, import_dayjs.default)(ends_at).format("LL");
    const confirmationLink = `${env.API_BASE_URL}/trips/${trip.id}/confirm`;
    const mail = await getMailClient();
    const message = await mail.sendMail({
      from: {
        name: "Equipe plann.er",
        address: "planner@planner.com"
      },
      to: {
        name: owner_name,
        address: owner_email
      },
      subject: `Confirme sua viagem para ${destination} em ${formattedStartDate}`,
      html: `
                <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
                    <p>Voc\xEA solicitou a cria\xE7\xE3o de uma viagem para <strong>${destination}</strong> nas datas de <strong>${formattedStartDate}</strong> at\xE9 <strong>${formattedEndDate}</strong>.</p>
                    <p></p>
                    <p>Para confirmar sua viagem, clique no link abaixo:</p>
                    <p></p>
                    <p><a href="${confirmationLink}">Confirmar Viagem</a></p>
                    <p></p>
                    <p>Caso voc\xEA n\xE3o saiba do que se trata esse e-mail, apenas ignore esse e-mail.</p>
                </div>
            `.trim()
    });
    console.log(import_nodemailer2.default.getTestMessageUrl(message));
    return { tripId: trip.id };
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createTrip
});
