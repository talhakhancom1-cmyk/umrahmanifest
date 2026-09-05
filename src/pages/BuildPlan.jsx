import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import plan from "@/docs/self-hosted-build-plan.md?raw";

const components = {
  h1: (p) => (
    <h1 className="text-2xl font-bold tracking-tight mt-2 mb-4" {...p} />
  ),
  h2: (p) => (
    <h2 className="text-xl font-semibold mt-10 mb-3 border-b border-border pb-2" {...p} />
  ),
  h3: (p) => <h3 className="text-base font-semibold mt-6 mb-2" {...p} />,
  p: (p) => <p className="text-sm leading-7 mb-4 text-foreground/90" {...p} />,
  ul: (p) => <ul className="list-disc pl-6 mb-4 space-y-1.5 text-sm leading-7" {...p} />,
  ol: (p) => <ol className="list-decimal pl-6 mb-4 space-y-1.5 text-sm leading-7" {...p} />,
  li: (p) => <li className="text-foreground/90" {...p} />,
  strong: (p) => <strong className="font-semibold text-foreground" {...p} />,
  code: ({ children, className }) =>
    className ? (
      <code className="block font-mono text-xs bg-muted border border-border rounded-md p-4 overflow-x-auto whitespace-pre leading-6 my-4" {...{ children }} />
    ) : (
      <code className="font-mono text-xs bg-muted rounded px-1.5 py-0.5" {...{ children }} />
    ),
  pre: (p) => <pre className="whitespace-pre-wrap" {...p} />,
  table: (p) => (
    <div className="overflow-x-auto mb-5 border border-border rounded-lg">
      <table className="w-full text-sm" {...p} />
    </div>
  ),
  th: (p) => (
    <th className="text-left font-semibold bg-muted px-3 py-2 border-b border-border" {...p} />
  ),
  td: (p) => <td className="px-3 py-2 border-b border-border align-top" {...p} />,
  a: (p) => <a className="text-primary underline" {...p} />,
  hr: () => <hr className="my-8 border-border" />,
  blockquote: (p) => (
    <blockquote className="border-l-4 border-primary/40 bg-muted/50 rounded-r-md px-4 py-3 mb-4 text-sm leading-7" {...p} />
  )
};

export default function BuildPlan() {
  const navigate = useNavigate();

  const download = () => {
    const blob = new Blob([plan], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "self-hosted-build-plan.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                Self-Hosted Build Plan
              </h1>
              <p className="text-sm text-muted-foreground">
                Full blueprint for rebuilding this system on your own backend.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={download}>
            <Download className="w-4 h-4" /> Download .md
          </Button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <ReactMarkdown components={components}>{plan}</ReactMarkdown>
      </main>
    </div>
  );
}