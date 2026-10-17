import { useMemo, useState } from "react";
import type { Person } from "../../domain/bill/types";
import { Avatar } from "../../components/ui/Avatar";
import { createId } from "../../utils/ids";

const PERSON_COLORS = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#eab308",
  "#ec4899",
];

const QUICK_EMOJIS = ["🙂", "😎", "🍔", "🍕", "🥤", "☕", "🧾", "💸"];

type PeopleEditorProps = {
  people: Person[];
  recentPeople?: Person[];
  onChange: (people: Person[]) => void;
};

export function PeopleEditor({
  people,
  recentPeople = [],
  onChange,
}: PeopleEditorProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🙂");
  const [color, setColor] = useState(PERSON_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const sortedPeople = useMemo(() => people, [people]);

  function resetForm() {
    setName("");
    setEmoji("🙂");
    setColor(PERSON_COLORS[0]);
    setEditingId(null);
    setError("");
  }

  function validatePersonName(
    nextName: string,
    currentId?: string,
  ): string | null {
    const trimmed = nextName.trim();

    if (!trimmed) return "Person name is required.";
    if (trimmed.length > 80) return "Person name is too long.";

    const duplicate = people.some(
      (person) =>
        person.id !== currentId &&
        person.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );

    if (duplicate) return "Two people cannot have the same name.";

    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validatePersonName(name, editingId ?? undefined);

    if (validationError) {
      setError(validationError);
      return;
    }

    const trimmedName = name.trim();

    if (editingId) {
      onChange(
        people.map((person) =>
          person.id === editingId
            ? {
                ...person,
                name: trimmedName,
                emoji,
                color,
              }
            : person,
        ),
      );
    } else {
      onChange([
        ...people,
        {
          id: createId("person"),
          name: trimmedName,
          emoji,
          color,
        },
      ]);
    }

    resetForm();
  }

  function addRecentPerson(person: Person) {
    const validationError = validatePersonName(person.name);

    if (validationError) {
      setError(validationError);
      return;
    }

    onChange([
      ...people,
      {
        id: createId("person"),
        name: person.name.trim(),
        emoji: person.emoji ?? "🙂",
        color: person.color ?? PERSON_COLORS[0],
      },
    ]);

    resetForm();
  }

  function startEdit(person: Person) {
    setEditingId(person.id);
    setName(person.name);
    setEmoji(person.emoji ?? "🙂");
    setColor(person.color ?? PERSON_COLORS[0]);
    setError("");
  }

  function deletePerson(personId: string) {
    onChange(people.filter((person) => person.id !== personId));

    if (editingId === personId) {
      resetForm();
    }
  }

  return (
    <section className="setup-panel">
      <div className="section-heading">
        <div>
          <h2>People</h2>
        </div>

        <span className="count-pill">{people.length} people</span>
      </div>

      {recentPeople.length > 0 ? (
        <div className="recent-people-panel">
          <div className="recent-people-header">
            <strong>Recent people</strong>
            <span>Click to add</span>
          </div>

          <div className="recent-people-list">
            {recentPeople.map((person) => (
              <button
                key={`${person.id}-${person.name}`}
                type="button"
                className="recent-person-button"
                onClick={() => addRecentPerson(person)}
              >
                <span
                  className="recent-person-avatar"
                  style={{ backgroundColor: person.color ?? PERSON_COLORS[0] }}
                >
                  {person.emoji ?? "🙂"}
                </span>
                <span className="recent-person-name">{person.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <form className="person-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="person-name">Name</label>
          <input
            id="person-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Example: Jad"
          />
        </div>

        <details className="form-disclosure">
          <summary>Personalize (optional)</summary>
          <div className="field">
            <span>Emoji</span>
            <div className="emoji-row">
              {QUICK_EMOJIS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={
                    emoji === option ? "emoji-button selected" : "emoji-button"
                  }
                  onClick={() => setEmoji(option)}
                  aria-label={`Choose ${option}`}
                  aria-pressed={emoji === option}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>Color</span>
            <div className="color-row">
              {PERSON_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={
                    color === option ? "color-button selected" : "color-button"
                  }
                  style={{ backgroundColor: option }}
                  onClick={() => setColor(option)}
                  aria-label={`Choose color ${option}`}
                  aria-pressed={color === option}
                />
              ))}
            </div>
          </div>
        </details>
        {error ? (
          <p role="alert" className="form-error">
            {error}
          </p>
        ) : null}

        <div className="form-actions">
          <button type="submit" className="primary-button">
            {editingId ? "Save person" : "Add person"}
          </button>

          {editingId ? (
            <button
              type="button"
              className="secondary-button"
              onClick={resetForm}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="people-list">
        {sortedPeople.length === 0 ? (
          <div className="empty-state">
            <strong>No people yet.</strong>
            <p>Add at least two people before creating the bill.</p>
          </div>
        ) : (
          sortedPeople.map((person) => (
            <div className="person-card" key={person.id}>
              <div className="person-main">
                <Avatar
                  name={person.name}
                  emoji={person.emoji}
                  color={person.color}
                />

                <div>
                  <strong>{person.name}</strong>
                </div>
              </div>

              <div className="person-actions">
                <button type="button" onClick={() => startEdit(person)}>
                  Edit
                </button>

                <button type="button" onClick={() => deletePerson(person.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
