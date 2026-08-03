import React from "react";
import { tokenizeHttpLinks } from "@/lib/linkify";

type LinkifiedTextProps = {
  text: string;
};

export function LinkifiedText({ text }: LinkifiedTextProps) {
  return (
    <>
      {tokenizeHttpLinks(text).map((token, index) => {
        if (token.kind === "link") {
          return (
            <a
              key={`${token.href}-${index}`}
              href={token.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              {token.label}
            </a>
          );
        }

        return token.value.split("\n").map((line, lineIndex, lines) => (
          <span key={`${index}-${lineIndex}`}>
            {line}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </span>
        ));
      })}
    </>
  );
}
