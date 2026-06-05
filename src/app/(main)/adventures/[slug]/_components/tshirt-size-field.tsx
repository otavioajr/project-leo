"use client";

import Image from "next/image";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TshirtSizeFieldProps = {
  label: string;
  required: boolean;
  options: string[];
  helpImageUrl?: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  onBlur?: () => void;
};

export function TshirtSizeField({
  label,
  required,
  options,
  helpImageUrl,
  value,
  onChange,
  name,
  onBlur,
}: TshirtSizeFieldProps) {
  const trimmedHelpImageUrl = helpImageUrl?.trim();

  return (
    <FormItem>
      <div className="flex items-center gap-2">
        <FormLabel>
          {label}
          {required && <span className="text-destructive">*</span>}
        </FormLabel>
        {trimmedHelpImageUrl ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label="Ver guia de tamanhos"
              >
                <CircleHelp className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{label}</DialogTitle>
              </DialogHeader>
              <div className="relative w-full min-h-[200px]">
                <Image
                  src={trimmedHelpImageUrl}
                  alt={`Guia de tamanhos: ${label}`}
                  width={1200}
                  height={800}
                  className="h-auto w-full object-contain"
                />
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
      <Select onValueChange={onChange} value={value}>
        <FormControl>
          <SelectTrigger onBlur={onBlur} name={name}>
            <SelectValue placeholder={`Selecione ${label.toLowerCase()}`} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  );
}
