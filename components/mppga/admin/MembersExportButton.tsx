"use client";

import { Download } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/mppga/ui/button";
import { exportMembersCsv } from "@/lib/admin/actions";

export function MembersExportButton() {
  const [pending, startTransition] = useTransition();

  function handleExport(): void {
    startTransition(async () => {
      const result = await exportMembersCsv();
      const blob = new Blob([result.csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <Button variant="secondary" onClick={handleExport} disabled={pending}>
      <Download className="h-4 w-4" strokeWidth={1.8} />
      {pending ? "Exporting…" : "Export CSV"}
    </Button>
  );
}
