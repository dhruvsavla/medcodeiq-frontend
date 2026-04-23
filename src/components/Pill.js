export default function Pill({ value }) {
  if (!value) return null;
  return <span className={`pill ${value}`}>{value}</span>;
}
