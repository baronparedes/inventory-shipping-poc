import {useContext} from "react";
import {PrototypeStateContext} from "./prototypeStateContext";

export function usePrototypeState() {
  const context = useContext(PrototypeStateContext);

  if (!context) {
    throw new Error("usePrototypeState must be used inside PrototypeStateProvider");
  }

  return context;
}
