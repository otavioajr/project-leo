import writeXlsxFile, { type Schema } from "write-excel-file/browser";

import type { Registration, RegistrationCustomValue } from "@/lib/types";

type ExportCellValue = string | number | boolean | Date | null | undefined;

type ExportRowKind = "Titular" | "Participante";
type ExportCustomColumnSource = "custom_data" | "participant";

export type ExportRegistrationsInput = {
  adventureTitle: string;
  registrations: Registration[];
};

export type ExportRegistrationsCustomColumn = {
  key: string;
  label: string;
  source: ExportCustomColumnSource;
};

export type ExportRegistrationRow = {
  registrationId: string;
  adventureTitle: string;
  registrationDate: string;
  groupSize: number;
  rowKind: ExportRowKind;
  groupPosition: number;
  personName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  paymentStatus: string;
  totalAmount: number | null;
  registrationToken: string;
  customValues: Record<string, string>;
};

const EMPTY_CELL = "";
const EXPORT_SHEET_NAME = "Inscricoes";
const EXPORT_DATE_LOCALE = "pt-BR";

function formatFieldLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatRegistrationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return EMPTY_CELL;
  }

  return new Intl.DateTimeFormat(EXPORT_DATE_LOCALE, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatPaymentStatus(value?: Registration["payment_status"]) {
  switch (value) {
    case "pending":
      return "Pendente";
    case "awaiting_confirmation":
      return "Aguardando confirmacao";
    case "confirmed":
      return "Confirmado";
    default:
      return EMPTY_CELL;
  }
}

function normalizeCellValue(value: unknown): ExportCellValue {
  if (value === null || value === undefined) {
    return EMPTY_CELL;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeCellValue(item))
      .filter((item): item is string | number | boolean | Date => item !== EMPTY_CELL)
      .map((item) => (item instanceof Date ? item.toISOString() : String(item)))
      .join(", ");
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date
  ) {
    return value;
  }

  return String(value);
}

function normalizeTextCellValue(value: unknown) {
  const normalized = normalizeCellValue(value);

  if (normalized === EMPTY_CELL) {
    return EMPTY_CELL;
  }

  return normalized instanceof Date ? normalized.toISOString() : String(normalized);
}

function createEmptyCustomValues(
  customColumns: ExportRegistrationsCustomColumn[]
): Record<string, string> {
  return Object.fromEntries(customColumns.map((column) => [column.key, EMPTY_CELL]));
}

function collectStableCustomColumns(
  registrations: Registration[]
): ExportRegistrationsCustomColumn[] {
  const customDataColumns = new Map<string, ExportRegistrationsCustomColumn>();
  const participantColumns = new Map<string, ExportRegistrationsCustomColumn>();

  for (const registration of registrations) {
    for (const key of Object.keys(registration.custom_data ?? {})) {
      if (key === "name" || customDataColumns.has(key)) {
        continue;
      }

      customDataColumns.set(key, {
        key,
        label: formatFieldLabel(key),
        source: "custom_data",
      });
    }

    for (const participant of registration.participants ?? []) {
      for (const key of Object.keys(participant)) {
        if (key === "name" || participantColumns.has(key)) {
          continue;
        }

        participantColumns.set(key, {
          key,
          label: formatFieldLabel(key),
          source: "participant",
        });
      }
    }
  }

  return [...customDataColumns.values(), ...participantColumns.values()];
}

function mapCustomValues(
  customColumns: ExportRegistrationsCustomColumn[],
  values: Record<string, RegistrationCustomValue> | Record<string, string> | undefined,
  source: ExportCustomColumnSource
) {
  const customValues = createEmptyCustomValues(customColumns);

  if (!values) {
    return customValues;
  }

  for (const column of customColumns) {
    if (column.source !== source) {
      continue;
    }

    customValues[column.key] = normalizeTextCellValue(values[column.key]);
  }

  return customValues;
}

function flattenRegistration(
  registration: Registration,
  customColumns: ExportRegistrationsCustomColumn[]
): ExportRegistrationRow[] {
  const baseRow = {
    registrationId: registration.id,
    adventureTitle: registration.adventure_title,
    registrationDate: formatRegistrationDate(registration.registration_date),
    groupSize: registration.group_size,
    contactName: registration.name,
    contactEmail: registration.email,
    contactPhone: registration.phone,
    paymentStatus: formatPaymentStatus(registration.payment_status),
    totalAmount: registration.total_amount ?? null,
    registrationToken: registration.registration_token ?? EMPTY_CELL,
  };

  const rows: ExportRegistrationRow[] = [
    {
      ...baseRow,
      rowKind: "Titular",
      groupPosition: 1,
      personName: registration.name,
      customValues: mapCustomValues(
        customColumns,
        registration.custom_data,
        "custom_data"
      ),
    },
  ];

  for (const [index, participant] of (registration.participants ?? []).entries()) {
    rows.push({
      ...baseRow,
      rowKind: "Participante",
      groupPosition: index + 2,
      personName: normalizeTextCellValue(participant.name),
      customValues: mapCustomValues(customColumns, participant, "participant"),
    });
  }

  return rows;
}

function sanitizeFileNamePart(value: string) {
  const sanitized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "aventura";
}

function getCurrentDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildExportFileName(adventureTitle: string) {
  return `inscricoes-${sanitizeFileNamePart(adventureTitle)}-${getCurrentDateStamp()}.xlsx`;
}

function buildExportSchema(
  customColumns: ExportRegistrationsCustomColumn[]
): Schema<ExportRegistrationRow> {
  return [
    {
      column: "Aventura",
      type: String,
      width: 24,
      value: (row) => row.adventureTitle,
    },
    {
      column: "ID da inscricao",
      type: String,
      width: 20,
      value: (row) => row.registrationId,
    },
    {
      column: "Data da inscricao",
      type: String,
      width: 18,
      value: (row) => row.registrationDate,
    },
    {
      column: "Tamanho do grupo",
      type: Number,
      width: 16,
      value: (row) => row.groupSize,
    },
    {
      column: "Tipo",
      type: String,
      width: 14,
      value: (row) => row.rowKind,
    },
    {
      column: "Posicao no grupo",
      type: Number,
      width: 16,
      value: (row) => row.groupPosition,
    },
    {
      column: "Nome",
      type: String,
      width: 24,
      value: (row) => row.personName,
    },
    {
      column: "Nome do contato",
      type: String,
      width: 24,
      value: (row) => row.contactName,
    },
    {
      column: "Email do contato",
      type: String,
      width: 28,
      value: (row) => row.contactEmail,
    },
    {
      column: "Telefone do contato",
      type: String,
      width: 18,
      value: (row) => row.contactPhone,
    },
    {
      column: "Status do pagamento",
      type: String,
      width: 20,
      value: (row) => row.paymentStatus,
    },
    {
      column: "Valor total",
      type: Number,
      width: 14,
      value: (row) => row.totalAmount,
    },
    {
      column: "Token da inscricao",
      type: String,
      width: 22,
      value: (row) => row.registrationToken,
    },
    ...customColumns.map((customColumn) => ({
      column: customColumn.label,
      type: String,
      width: 22,
      value: (row: ExportRegistrationRow) => row.customValues[customColumn.key] ?? EMPTY_CELL,
    })),
  ];
}

export function getRegistrationExportRows(registrations: Registration[]) {
  const customColumns = collectStableCustomColumns(registrations);
  const rows = registrations.flatMap((registration) =>
    flattenRegistration(registration, customColumns)
  );

  return {
    customColumns,
    rows,
  };
}

export async function exportRegistrationsToXlsx({
  adventureTitle,
  registrations,
}: ExportRegistrationsInput) {
  const normalizedAdventureTitle =
    adventureTitle.trim() || registrations[0]?.adventure_title || "Aventura";
  const { customColumns, rows } = getRegistrationExportRows(registrations);

  await writeXlsxFile(rows, {
    schema: buildExportSchema(customColumns),
    fileName: buildExportFileName(normalizedAdventureTitle),
    sheet: EXPORT_SHEET_NAME,
    fontFamily: "Open Sans",
  });
}
