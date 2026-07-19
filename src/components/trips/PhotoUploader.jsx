import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2 } from "lucide-react";
import { extractPassengers } from "@/lib/extractPassengers";

export default function PhotoUploader({ onExtracted }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    setProgress({ done: 0, total: files.length });
    try {
      const { passengers, photoUrls } = await extractPassengers(files, (done, total) =>
        setProgress({ done, total })
      );
      onExtracted(passengers, photoUrls);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <UploadCloud className="w-4 h-4" />
        )}
        {busy
          ? `Extracting ${progress.done}/${progress.total}...`
          : "Upload & Extract Photos"}
      </Button>
    </div>
  );
}