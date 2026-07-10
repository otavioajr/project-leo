"use client";

import type { RefCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CustomField,
  RegistrationCustomValue,
} from "@/lib/types";
import { TshirtSizeField } from "./tshirt-size-field";

type DynamicRegistrationFieldProps = {
  customField: CustomField;
  value: RegistrationCustomValue | undefined;
  onChange: (value: RegistrationCustomValue) => void;
  onBlur?: () => void;
  name: string;
  inputRef?: RefCallback<HTMLInputElement>;
};

export function DynamicRegistrationField({
  customField,
  value,
  onChange,
  onBlur,
  name,
  inputRef,
}: DynamicRegistrationFieldProps) {
  const label = (
    <>
      {customField.label}
      {customField.required && <span className="text-destructive">*</span>}
    </>
  );

  if (customField.type === "tshirt_size") {
    return (
      <TshirtSizeField
        label={customField.label}
        required={customField.required}
        options={customField.options ?? []}
        helpImageUrl={customField.helpImageUrl}
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
        name={name}
        onBlur={onBlur}
      />
    );
  }

  if (customField.type === "select") {
    return (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <Select
          onValueChange={onChange}
          value={typeof value === "string" ? value : ""}
        >
          <FormControl>
            <SelectTrigger onBlur={onBlur} name={name}>
              <SelectValue
                placeholder={`Selecione ${customField.label.toLowerCase()}`}
              />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {(customField.options ?? []).map((option) => (
              <SelectItem key={`${customField.name}-${option}`} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    );
  }

  if (customField.type === "multiselect") {
    const selectedValues = Array.isArray(value) ? value : [];

    return (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <div className="space-y-2">
          {(customField.options ?? []).map((option) => {
            const checked = selectedValues.includes(option);
            const optionId = `${name}-${option}`.replace(/[^a-zA-Z0-9_-]/g, "-");
            return (
              <div
                key={`${customField.name}-${option}`}
                className="flex items-center gap-2"
              >
                <Checkbox
                  id={optionId}
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    onChange(
                      isChecked === true
                        ? Array.from(new Set([...selectedValues, option]))
                        : selectedValues.filter(
                            (selectedValue) => selectedValue !== option
                          )
                    );
                    onBlur?.();
                  }}
                />
                <label
                  htmlFor={optionId}
                  className="cursor-pointer text-sm font-normal"
                >
                  {option}
                </label>
              </div>
            );
          })}
        </div>
        <FormMessage />
      </FormItem>
    );
  }

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <Input
          placeholder={customField.label}
          type={customField.type}
          name={name}
          value={typeof value === "string" ? value : ""}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          ref={inputRef}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}
