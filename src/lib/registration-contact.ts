import type { CustomField, RegistrationCustomData } from "@/lib/types";

const PLACEHOLDER_EMAIL_DOMAIN = "@interno.local";

export function isPlaceholderRegistrationEmail(email: string) {
  return email.includes(PLACEHOLDER_EMAIL_DOMAIN);
}

function formatFieldNameFromKey(name: string) {
  const words = name.replace(/_/g, " ").split(" ");
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function getStringValue(customData: RegistrationCustomData, fieldName: string): string {
  const value = customData[fieldName];
  return typeof value === "string" ? value.trim() : "";
}

export function deriveLegacyContactFields(
  customFields: CustomField[],
  customData: RegistrationCustomData
): { name: string; email: string; phone: string } {
  const nameField =
    customFields.find(
      (field) =>
        field.type === "text" &&
        (/nome/i.test(field.label) || field.name === "nome" || field.name === "name")
    ) ?? customFields.find((field) => field.type === "text");

  const emailField = customFields.find((field) => field.type === "email");
  const telField = customFields.find((field) => field.type === "tel");

  const name = nameField ? getStringValue(customData, nameField.name) : "";
  const email = emailField ? getStringValue(customData, emailField.name) : "";
  const phone = telField ? getStringValue(customData, telField.name) : "";

  return {
    name: name || "—",
    email: email || `inscricao-${crypto.randomUUID()}${PLACEHOLDER_EMAIL_DOMAIN}`,
    phone,
  };
}

export function deriveParticipantDisplayName(
  fields: CustomField[],
  values: RegistrationCustomData
): string {
  const textFields = fields.filter((field) => field.type === "text");
  const nameField =
    textFields.find(
      (field) => /nome/i.test(field.label) || field.name === "nome" || field.name === "name"
    ) ?? textFields[0];

  const value = nameField ? values[nameField.name] : undefined;
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return "—";
}

type FormatCustomDataOptions = {
  labelByKey?: Map<string, string>;
  excludeKeys?: string[];
};

export function formatCustomDataEntries(
  customData: RegistrationCustomData | undefined,
  options?: FormatCustomDataOptions
): { label: string; value: string }[] {
  if (!customData) {
    return [];
  }

  const excludeKeys = new Set(options?.excludeKeys ?? []);

  return Object.entries(customData).flatMap(([key, value]) => {
    if (excludeKeys.has(key) || value === undefined || value === null) {
      return [];
    }

    const label = options?.labelByKey?.get(key) ?? formatFieldNameFromKey(key);

    if (Array.isArray(value)) {
      const joined = value.filter((item) => item.trim() !== "").join(", ");
      if (!joined) {
        return [];
      }
      return [{ label, value: joined }];
    }

    const text = typeof value === "string" ? value.trim() : "";
    if (!text) {
      return [];
    }

    return [{ label, value: text }];
  });
}
