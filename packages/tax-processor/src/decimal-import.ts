import DecimalImport from "decimal.js/decimal.js";

const Decimal = DecimalImport as typeof DecimalImport & (new (value: string | number) => {
  plus(v: string | number): unknown;
  isFinite(): boolean;
  isZero(): boolean;
  isNegative(): boolean;
  isPositive(): boolean;
  abs(): unknown;
  times(v: string | number): unknown;
  toFixed(dp?: number): string;
  toDecimalPlaces(dp: number, rm?: number): unknown;
  toNumber(): number;
  lessThanOrEqualTo(v: string | number): boolean;
});

export default Decimal as unknown as {
  new (value: string | number): {
    plus(v: string | number): DecimalLike;
    isFinite(): boolean;
    isZero(): boolean;
    isNegative(): boolean;
    isPositive(): boolean;
    abs(): DecimalLike;
    times(v: string | number): DecimalLike;
    toFixed(dp?: number): string;
    toDecimalPlaces(dp: number, rm?: number): DecimalLike;
    toNumber(): number;
    lessThanOrEqualTo(v: string | number): boolean;
  };
  (value: string | number): DecimalLike;
  set(config: { precision?: number; rounding?: number }): void;
};

type DecimalLike = {
  plus(v: string | number): DecimalLike;
  isFinite(): boolean;
  isZero(): boolean;
  isNegative(): boolean;
  isPositive(): boolean;
  abs(): DecimalLike;
  times(v: string | number): DecimalLike;
  toFixed(dp?: number): string;
  toDecimalPlaces(dp: number, rm?: number): DecimalLike;
  toNumber(): number;
  lessThanOrEqualTo(v: string | number): boolean;
};
