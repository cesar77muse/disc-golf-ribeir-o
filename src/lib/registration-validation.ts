// Zod schema for the public tournament registration form
// (src/components/TournamentRegisterForm.tsx). Division/kit are validated
// against the tournament's actual data so a tampered value can't reach
// createRegistration's price lookup in src/lib/registrations.ts.
import { z } from "zod";
import type { Tournament } from "@/lib/site-data";

function parseDDMMYYYY(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  const isRealDate =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isRealDate ? date : null;
}

/** DD/MM/AAAA (as validated by createRegistrationSchema) -> YYYY-MM-DD for the `date` column. */
export function birthDateToISO(value: string): string {
  const date = parseDDMMYYYY(value);
  if (!date) throw new Error("Data de nascimento inválida.");
  const yyyy = String(date.getFullYear()).padStart(4, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function isValidCPF(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const checkDigit = (base: string, factorStart: number) => {
    const sum = base
      .split("")
      .reduce((acc, digit, i) => acc + Number(digit) * (factorStart - i), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const base = digits.slice(0, 9);
  const d1 = checkDigit(base, 10);
  const d2 = checkDigit(base + d1, 11);
  return digits === `${base}${d1}${d2}`;
}

export function createRegistrationSchema(tournament: Tournament) {
  return z
    .object({
      fullName: z
        .string()
        .trim()
        .min(3, "Informe o nome completo.")
        .refine((v) => !/\d/.test(v), "O nome não pode conter números."),
      phone: z
        .string()
        .trim()
        .min(1, "Informe o WhatsApp.")
        .refine((v) => !/[a-zA-Z]/.test(v), "O WhatsApp não pode conter letras.")
        .refine((v) => {
          const digits = v.replace(/\D/g, "");
          return digits.length >= 10 && digits.length <= 11;
        }, "Informe um telefone válido com DDD."),
      email: z.string().trim().min(1, "Informe o e-mail.").email("E-mail inválido."),
      cpf: z.string().trim().min(1, "Informe o CPF.").refine(isValidCPF, "CPF inválido."),
      city: z
        .string()
        .trim()
        .min(2, "Informe a cidade.")
        .refine((v) => !/\d/.test(v), "A cidade não pode conter números."),
      birthDate: z
        .string()
        .min(1, "Informe a data de nascimento.")
        .refine(
          (v) => /^\d{2}\/\d{2}\/\d{4}$/.test(v) && parseDDMMYYYY(v) !== null,
          "Use o formato DD/MM/AAAA com uma data válida.",
        )
        .refine((v) => {
          const date = parseDDMMYYYY(v);
          return date !== null && date <= new Date();
        }, "A data de nascimento não pode ser no futuro."),
      pdgaNumber: z
        .string()
        .trim()
        .optional()
        .refine((v) => !v || /^\d+$/.test(v), "Informe apenas números ou deixe em branco."),
      division: z.string().min(1, "Selecione uma divisão."),
      kit: z.string().min(1, "Selecione um kit."),
    })
    .superRefine((data, ctx) => {
      const division = tournament.divisions.find((d) => d.name === data.division);
      if (!division) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione uma divisão válida.",
          path: ["division"],
        });
        return;
      }
      if (!division.prices.some((p) => p.label === data.kit)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione um kit válido para a divisão escolhida.",
          path: ["kit"],
        });
      }
    });
}

export type RegistrationFormValues = z.infer<ReturnType<typeof createRegistrationSchema>>;
