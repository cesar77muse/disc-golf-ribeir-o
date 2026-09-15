import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  createRegistrationSchema,
  type RegistrationFormValues,
} from "@/lib/registration-validation";
import { startTournamentCheckout } from "@/lib/checkout";
import type { Tournament } from "@/lib/site-data";

function formatCPF(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** Blocks the character at typing time so the user never gets to submit it. */
function stripDigits(value: string) {
  return value.replace(/\d/g, "");
}

function stripLetters(value: string) {
  return value.replace(/[a-zA-Z]/g, "");
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * DD/MM/AAAA — capped at 8 digits so the year can never grow past 4, and the
 * day/month are kept in range as they are typed: a lone 4-9 can only ever be
 * an invalid day, so it is padded into 04-09 (same for a lone 2-9 as month).
 */
function formatBirthDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  let day = digits.slice(0, 2);
  if (day.length === 1 && Number(day) > 3) day = `0${day}`;
  else if (day.length === 2) day = clampSegment(day, 1, 31);

  let month = digits.slice(2, 4);
  if (month.length === 1 && Number(month) > 1) month = `0${month}`;
  else if (month.length === 2) month = clampSegment(month, 1, 12);

  const year = digits.slice(4, 8);

  return [day, month, year].filter((part) => part !== "").join("/");
}

function clampSegment(value: string, min: number, max: number) {
  const clamped = Math.min(Math.max(Number(value), min), max);
  return String(clamped).padStart(2, "0");
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

export function TournamentRegisterForm({ tournament }: { tournament: Tournament }) {
  // Kept separate from isSubmitting: the redirect to Mercado Pago takes a
  // moment, and the button must stay busy for all of it.
  const [redirecting, setRedirecting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const firstDivision = tournament.divisions[0];
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(createRegistrationSchema(tournament)),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      cpf: "",
      city: "",
      birthDate: "",
      pdgaNumber: "",
      division: firstDivision?.name ?? "",
      kit: firstDivision?.prices[0]?.label ?? "",
    },
  });

  const division = form.watch("division");
  const kit = form.watch("kit");
  const selectedDivision = tournament.divisions.find((d) => d.name === division);
  const selectedPrice =
    selectedDivision?.prices.find((p) => p.label === kit) ?? selectedDivision?.prices[0];

  function handleDivisionChange(value: string) {
    const next = tournament.divisions.find((d) => d.name === value);
    form.setValue("division", value, { shouldValidate: true });
    form.setValue("kit", next?.prices[0]?.label ?? "", { shouldValidate: true });
  }

  /**
   * The sign-up row and the amount to charge are created on the server (see
   * src/lib/checkout.ts); this only hands over the validated form and follows
   * the Checkout Pro link it gets back.
   */
  async function onSubmit(values: RegistrationFormValues) {
    setSubmitError(null);
    setRedirecting(true);
    try {
      const session = await startTournamentCheckout({
        data: {
          tournamentSlug: tournament.slug,
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          cpf: values.cpf,
          city: values.city,
          birthDate: values.birthDate,
          pdgaNumber: values.pdgaNumber ?? "",
          divisionName: values.division,
          priceLabel: values.kit,
        },
      });
      window.location.href = session.initPoint;
    } catch (err) {
      setRedirecting(false);
      setSubmitError(err instanceof Error ? err.message : "Não foi possível iniciar o pagamento.");
    }
  }

  return (
    <Card className="sticky top-24 border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl">Inscreva-se</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormSection title="Dados pessoais">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(stripDigits(e.target.value))}
                          className="bg-background"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(stripLetters(e.target.value))}
                          inputMode="tel"
                          className="bg-background"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(formatCPF(e.target.value))}
                          placeholder="000.000.000-00"
                          inputMode="numeric"
                          className="bg-background"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(stripDigits(e.target.value))}
                          className="bg-background"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de nascimento</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(formatBirthDate(e.target.value))}
                          placeholder="DD/MM/AAAA"
                          inputMode="numeric"
                          maxLength={10}
                          className="bg-background"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>

              <FormSection title="Dados PDGA">
                <FormField
                  control={form.control}
                  name="pdgaNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número PDGA (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(onlyDigits(e.target.value))}
                          placeholder="Ex: 123456"
                          inputMode="numeric"
                          className="bg-background"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>

              <FormSection title="Categoria">
                <FormField
                  control={form.control}
                  name="division"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Divisão</FormLabel>
                      <Select value={field.value} onValueChange={handleDivisionChange}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tournament.divisions.map((d) => (
                            <SelectItem key={d.name} value={d.name}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="kit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kit</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedDivision?.prices.map((p) => (
                            <SelectItem key={p.label} value={p.label}>
                              {p.label} — R$ {p.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>

              {selectedPrice && (
                <p className="text-sm text-muted-foreground">
                  Valor: <span className="font-semibold text-acid">R$ {selectedPrice.price}</span>
                </p>
              )}

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              <Button
                type="submit"
                disabled={form.formState.isSubmitting || redirecting}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {form.formState.isSubmitting || redirecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                {redirecting ? "Redirecionando…" : "Pagar inscrição"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Você será levado ao Mercado Pago para pagar com PIX, cartão ou boleto.
              </p>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}
