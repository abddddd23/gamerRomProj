interface MoneyValueProps {
  value: number;
  signed?: boolean;
}

export function MoneyValue({ value, signed = false }: MoneyValueProps) {
  const className = value < 0 ? "money-value money-negative" : value > 0 ? "money-value money-positive" : "money-value";
  const prefix = signed && value > 0 ? "+" : "";
  return <span className={className}>{prefix}{value.toLocaleString()} DZD</span>;
}

export function Money(props: MoneyValueProps) {
  return <MoneyValue {...props} />;
}
