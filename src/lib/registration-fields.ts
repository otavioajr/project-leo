import type {
  CustomField,
  CustomFieldAudience,
  RegistrationCustomData,
  RegistrationCustomValue,
} from "@/lib/types";

export type CustomFieldTarget = "primary" | "additional";

export function resolveCustomFieldAudience(
  field: Pick<CustomField, "type" | "audience">
): CustomFieldAudience {
  if (field.audience) {
    return field.audience;
  }

  return field.type === "select" || field.type === "multiselect"
    ? "primary"
    : "all";
}

export function filterCustomFieldsForTarget(
  fields: CustomField[],
  target: CustomFieldTarget
): CustomField[] {
  return fields.filter((field) => {
    const audience = resolveCustomFieldAudience(field);
    return audience === "all" || audience === target;
  });
}

export function getCustomFieldDefaultValue(
  field: CustomField
): RegistrationCustomValue {
  return field.type === "multiselect" ? [] : "";
}

export function createCustomFieldDefaults(
  fields: CustomField[]
): RegistrationCustomData {
  return Object.fromEntries(
    fields.map((field) => [field.name, getCustomFieldDefaultValue(field)])
  );
}

export function isRequiredCustomValueFilled(
  field: CustomField,
  value: RegistrationCustomValue | undefined
): boolean {
  if (!field.required) {
    return true;
  }

  if (field.type === "multiselect") {
    return (
      Array.isArray(value) &&
      value.some((selectedValue) => selectedValue.trim() !== "")
    );
  }

  return typeof value === "string" && value.trim() !== "";
}

export function buildCustomFieldPayload(
  fields: CustomField[],
  values: Record<string, RegistrationCustomValue | undefined> | undefined
): RegistrationCustomData {
  return Object.fromEntries(
    fields.map((field) => {
      const value = values?.[field.name];
      const fieldValue =
        field.type === "multiselect"
          ? Array.isArray(value)
            ? value
            : []
          : typeof value === "string"
            ? value
            : "";

      return [field.name, fieldValue] as const;
    })
  );
}
