"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import {
  searchOrganizations,
  type OrganizationMatch,
} from "@/lib/membership/search-organizations";

type Selection =
  | { kind: "none" }
  | { kind: "existing"; id: string; name: string }
  | { kind: "new"; name: string };

interface SalonComboboxProps {
  /**
   * When the user picks an existing salon, the form posts this hidden
   * field with the org UUID. The auth callback reads it to link the
   * new profile.
   */
  existingIdName?: string;
  /**
   * When the user types a salon that doesn't exist yet, the form posts
   * this hidden field with the free-text name; the callback creates
   * the stub org row.
   */
  newNameName?: string;
  /** Defaults to the trimmed name from typed input. */
  defaultValue?: string;
  fieldId?: string;
}

export function SalonCombobox({
  existingIdName = "salon_id",
  newNameName = "salon_new_name",
  defaultValue = "",
  fieldId,
}: SalonComboboxProps) {
  const autoId = useId();
  const inputId = fieldId ?? `salon-combobox-${autoId}`;
  const listboxId = `${inputId}-listbox`;

  const [input, setInput] = useState(defaultValue);
  const [matches, setMatches] = useState<OrganizationMatch[]>([]);
  const [selection, setSelection] = useState<Selection>({ kind: "none" });
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  // Track the latest in-flight request id so an out-of-order response
  // can't overwrite newer matches with stale ones.
  const requestRef = useRef(0);

  useEffect(() => {
    const trimmed = input.trim();
    if (selection.kind === "existing" && selection.name === input) {
      // The user picked a match, didn't keep typing. Skip refetch.
      return;
    }
    if (trimmed.length < 2) {
      setMatches([]);
      setLoading(false);
      return;
    }
    const reqId = ++requestRef.current;
    setLoading(true);
    const handle = window.setTimeout(async () => {
      const results = await searchOrganizations(trimmed);
      if (reqId !== requestRef.current) return;
      setMatches(results);
      setLoading(false);
      setHighlight(0);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [input, selection]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const trimmed = input.trim();
  const exactExisting = matches.find(
    (m) => m.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const showCreateOption =
    trimmed.length >= 2 && !exactExisting && !loading && selection.kind !== "existing";
  // Total option count = existing matches + maybe one "use as new" row.
  const optionCount = matches.length + (showCreateOption ? 1 : 0);

  const commitSelection = useCallback(
    (next: Selection) => {
      setSelection(next);
      if (next.kind === "existing") {
        setInput(next.name);
      } else if (next.kind === "new") {
        setInput(next.name);
      }
      setOpen(false);
    },
    [],
  );

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInput(value);
    setOpen(true);
    // Any edit clears a prior selection; the user's text is the source
    // of truth until they re-pick.
    if (selection.kind !== "none") {
      setSelection({ kind: "none" });
    }
  };

  const handleFocus = () => {
    if (trimmed.length >= 2) setOpen(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      setHighlight((h) => (optionCount === 0 ? 0 : (h + 1) % optionCount));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) =>
        optionCount === 0 ? 0 : (h - 1 + optionCount) % optionCount,
      );
      return;
    }
    if (event.key === "Enter") {
      if (!open || optionCount === 0) return;
      event.preventDefault();
      if (highlight < matches.length) {
        const match = matches[highlight];
        if (match) commitSelection({ kind: "existing", id: match.id, name: match.name });
      } else if (showCreateOption) {
        commitSelection({ kind: "new", name: trimmed });
      }
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  // Hidden inputs the parent form reads. Only one of (salon_id,
  // salon_new_name) is non-empty, matching the action's discriminated
  // schema. If the user typed and never picked, treat as "new" name so
  // we don't silently drop their input.
  let submitId = "";
  let submitNewName = "";
  if (selection.kind === "existing") {
    submitId = selection.id;
  } else if (selection.kind === "new") {
    submitNewName = selection.name;
  } else if (trimmed.length >= 2) {
    submitNewName = trimmed;
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="hidden"
        name={existingIdName}
        value={submitId}
        readOnly
      />
      <input
        type="hidden"
        name={newNameName}
        value={submitNewName}
        readOnly
      />
      <input
        id={inputId}
        type="text"
        autoComplete="organization"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        value={input}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder="Start typing your salon’s name"
        className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-page px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
      />

      {open && (matches.length > 0 || showCreateOption) ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border border-mppga-divider bg-mppga-card shadow-lg"
        >
          {matches.map((match, index) => {
            const isHighlighted = index === highlight;
            return (
              <li
                key={match.id}
                role="option"
                aria-selected={isHighlighted}
                onMouseDown={(event) => {
                  // mousedown beats the blur on the input, so the
                  // selection commits before the listbox closes.
                  event.preventDefault();
                  commitSelection({
                    kind: "existing",
                    id: match.id,
                    name: match.name,
                  });
                }}
                onMouseEnter={() => setHighlight(index)}
                className={
                  "cursor-pointer px-3 py-2 text-sm " +
                  (isHighlighted
                    ? "bg-mppga-teal-tint text-mppga-ink"
                    : "text-mppga-ink-soft")
                }
              >
                {match.name}
              </li>
            );
          })}

          {showCreateOption ? (
            <li
              role="option"
              aria-selected={highlight === matches.length}
              onMouseDown={(event) => {
                event.preventDefault();
                commitSelection({ kind: "new", name: trimmed });
              }}
              onMouseEnter={() => setHighlight(matches.length)}
              className={
                "cursor-pointer border-t border-mppga-divider px-3 py-2 text-sm " +
                (highlight === matches.length
                  ? "bg-mppga-teal-tint text-mppga-ink"
                  : "text-mppga-ink-soft")
              }
            >
              Use &ldquo;{trimmed}&rdquo; as a new salon
            </li>
          ) : null}
        </ul>
      ) : null}

      <p className="mt-1.5 text-xs text-mppga-ink-muted">
        {selection.kind === "existing"
          ? "Linked to an existing salon in our directory."
          : selection.kind === "new" || (selection.kind === "none" && trimmed.length >= 2)
            ? "We’ll add this salon to our records when you join."
            : "If you don’t see your salon, just type the name."}
      </p>
    </div>
  );
}
