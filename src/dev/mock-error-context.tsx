import { createContext, useContext, useState, type ReactNode } from "react";
import {
  setMockBridgeTimeout,
  setMockErpNext500,
  setMockFetchError,
} from "../data/projects-service-mock";

export interface MockErrorFlags {
  bridgeTimeout: boolean;
  erpNext500: boolean;
  fetchError: boolean;
}

interface MockErrorContextValue {
  flags: MockErrorFlags;
  setFlag: (key: keyof MockErrorFlags, value: boolean) => void;
}

const defaultFlags: MockErrorFlags = {
  bridgeTimeout: false,
  erpNext500: false,
  fetchError: false,
};

const MockErrorContext = createContext<MockErrorContextValue>({
  flags: defaultFlags,
  setFlag: () => {},
});

export function MockErrorProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<MockErrorFlags>(defaultFlags);

  function setFlag(key: keyof MockErrorFlags, value: boolean) {
    setFlags((prev) => ({ ...prev, [key]: value }));
    if (key === "bridgeTimeout") setMockBridgeTimeout(value);
    else if (key === "erpNext500") setMockErpNext500(value);
    else if (key === "fetchError") setMockFetchError(value);
  }

  return (
    <MockErrorContext.Provider value={{ flags, setFlag }}>
      {children}
    </MockErrorContext.Provider>
  );
}

export function useMockErrors(): MockErrorContextValue {
  return useContext(MockErrorContext);
}
