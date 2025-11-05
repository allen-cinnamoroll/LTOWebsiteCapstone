import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, Car, Plus } from "lucide-react";

const normalize = (s) => (s || "").toString().trim().toLowerCase();

const formatNameFirstLast = (firstName, lastName) => {
  const f = (firstName || "").toString().trim();
  const l = (lastName || "").toString().trim();
  if (!f && !l) return "Unknown";
  if (!l) return f;
  if (!f) return l;
  return `${f} ${l}`;
};

const SearchViolatorModal = ({ open, onOpenChange, violations = [], onSelectExisting, onAddNew }) => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (q.length < 2) return [];
    // Match against first name, last name, full name, plate, topNo
    return violations.filter((v) => {
      const first = normalize(v.firstName);
      const last = normalize(v.lastName);
      const full1 = `${first} ${last}`.trim();
      const full2 = `${last} ${first}`.trim();
      const plate = normalize(v.plateNo);
      const top = normalize(v.topNo);
      return (
        first.includes(q) ||
        last.includes(q) ||
        full1.includes(q) ||
        full2.includes(q) ||
        plate.includes(q) ||
        top.includes(q)
      );
    });
  }, [query, violations]);

  const handleSelect = (v) => {
    if (onSelectExisting) onSelectExisting(v);
    onOpenChange(false);
  };

  const handleAddNew = () => {
    if (onAddNew) {
      // Try to parse "FirstName Surname" from query
      const parts = query.trim().split(/\s+/);
      const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] || "";
      const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
      onAddNew({ firstName, lastName });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Search and Select Violator</DialogTitle>
          <DialogDescription>
            Search an existing violator to update their record, or add a new violator if not found.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Search by first name surname, plate number, or TOP no."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <Button type="button" variant="secondary" onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-1" /> Add New
          </Button>
        </div>

        <div className="mt-3 max-h-80 overflow-y-auto border rounded-md">
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">Type at least 2 characters to search. If not found, click Add New.</div>
          ) : (
            filtered.map((v) => (
              <button
                key={v._id}
                type="button"
                onClick={() => handleSelect(v)}
                className="w-full text-left p-3 border-b last:border-b-0 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium">
                      {formatNameFirstLast(v.firstName, v.lastName)}
                    </div>
                    <div className="text-xs text-gray-500">TOP: {v.topNo || "N/A"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Car className="h-4 w-4" /> {v.plateNo || "N/A"}
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchViolatorModal;


