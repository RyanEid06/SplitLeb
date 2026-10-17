type Issue = {
  kind: string;
  billTitle: string;
  currency: string;
  personName?: string;
};
export function GroupIssues({ issues }: { issues: Issue[] }) {
  if (!issues.length) return null;
  return (
    <details className="group-issues">
      <summary>
        Check {issues.length} {issues.length === 1 ? "record" : "records"}
      </summary>
      <ul>
        {issues.map((issue, index) => (
          <li key={index}>
            {issue.billTitle} ({issue.currency}):{" "}
            {issue.kind === "billCalculationFailed"
              ? "fix the split before it can be included."
              : issue.personName
                ? issue.personName +
                  " could not be matched to a member; their figures were excluded."
                : "a payment could not be matched to a person and was excluded."}
          </li>
        ))}
      </ul>
    </details>
  );
}
