import type { z } from "zod";
import { AppError } from "../errors/AppError";

// Contrato quebrado vira erro tipado na borda, não `undefined` no meio da tela.
export const parseResponse = <S extends z.ZodType>(schema: S, data: unknown): z.output<S> => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError("invalid_response", undefined, { cause: result.error });
  }
  return result.data;
};
