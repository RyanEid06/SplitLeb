type IconName = "home" | "plus" | "groups" | "history" | "arrow" | "check";
const paths: Record<IconName, string> = {
  home: "m3 10 9-7 9 7v10H3V10m6 10v-7h6v7",
  plus: "M12 5v14M5 12h14",
  groups:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7a4 4 0 0 1 0 7.75",
  history: "M3 11a9 9 0 1 1 2.6 7M3 4v7h7m2-4v5l3 2",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  check: "m5 12 4 4L19 6",
};
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
