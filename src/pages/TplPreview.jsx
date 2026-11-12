import React, { useEffect, useState } from "react";

export default function TplPreview() {
  const src = new URLSearchParams(window.location.search).get("src");
  const [html, setHtml] = useState("");
  useEffect(() => {
    fetch(src).then((r) => r.text()).then(setHtml);
  }, [src]);
  return <iframe title="preview" srcDoc={html} style={{ width: "100%", height: "3800px", border: 0 }} />;
}