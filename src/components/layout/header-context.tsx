"use client";

import { createContext, useContext, useState } from "react";

type HeaderContextType = {
  transparent: boolean;
  setTransparent: (v: boolean) => void;
};

const HeaderContext = createContext<HeaderContextType>({
  transparent: false,
  setTransparent: () => {},
});

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [transparent, setTransparent] = useState(false);
  return (
    <HeaderContext.Provider value={{ transparent, setTransparent }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeaderTransparent() {
  return useContext(HeaderContext);
}
