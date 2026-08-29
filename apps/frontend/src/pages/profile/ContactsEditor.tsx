import * as React from "react";
import type { ContactEntry } from "@resume-builder/shared";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

function newContact(): ContactEntry {
  return {
    id: crypto.randomUUID(),
    label: "",
    address: "",
    email: "",
    phone: "",
    linkedin: "",
    isPrimary: false,
  };
}

interface ContactsEditorProps {
  value: ContactEntry[];
  onChange: (contacts: ContactEntry[]) => void;
}

export const ContactsEditor: React.FC<ContactsEditorProps> = ({
  value,
  onChange,
}) => {
  const updateAt = (index: number, patch: Partial<ContactEntry>) => {
    const next = value.map((contact, i) =>
      i === index ? { ...contact, ...patch } : contact,
    );
    onChange(next);
  };

  const setPrimary = (index: number) => {
    onChange(
      value.map((contact, i) => ({
        ...contact,
        isPrimary: i === index,
      })),
    );
  };

  const removeAt = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((c) => c.isPrimary)) {
      next[0] = { ...next[0], isPrimary: true };
    }
    onChange(next);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Contacts</CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onChange([
              ...value,
              { ...newContact(), isPrimary: value.length === 0 },
            ])
          }
        >
          <Plus className="h-4 w-4" />
          Add contact
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {value.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add at least one contact with email and mark it primary.
          </p>
        ) : null}
        {value.map((contact, index) => (
          <div
            key={contact.id}
            className="space-y-3 rounded-lg border border-border p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="primary-contact"
                  checked={!!contact.isPrimary}
                  onChange={() => setPrimary(index)}
                />
                Primary
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeAt(index)}
                aria-label="Remove contact"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Label</Label>
                <Input
                  value={contact.label ?? ""}
                  onChange={(e) => updateAt(index, { label: e.target.value })}
                  placeholder="Home / Work"
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  value={contact.email ?? ""}
                  onChange={(e) => updateAt(index, { email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  value={contact.phone ?? ""}
                  onChange={(e) => updateAt(index, { phone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Address</Label>
                <Input
                  value={contact.address ?? ""}
                  onChange={(e) => updateAt(index, { address: e.target.value })}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>LinkedIn</Label>
                <Input
                  value={contact.linkedin ?? ""}
                  onChange={(e) => updateAt(index, { linkedin: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
