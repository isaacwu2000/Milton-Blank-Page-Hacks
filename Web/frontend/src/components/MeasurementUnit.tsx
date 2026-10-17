import { Math as MathLabel } from "./Math";
/** Physical units use compact fractions while measurements remain ordinary numbers. */
export function MeasurementUnit({ unit }: { unit: string }) {
  const formulas: Record<string, string> = {
    "m/s": String.raw`\frac{\mathrm{m}}{\mathrm{s}}`,
    "m/s²": String.raw`\frac{\mathrm{m}}{\mathrm{s}^{2}}`,
  };
  return formulas[unit] ? (
    <MathLabel expression={formulas[unit]} label={unit} />
  ) : (
    <>{unit}</>
  );
}
