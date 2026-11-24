"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";

/** Builds a mailto: link – no backend, nothing stored. */
export function ContactForm({ email }: { email: string }) {
  const [topic, setTopic] = useState("Recipe correction");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-4 rounded-[0.875rem] border border-line bg-paper p-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (message.trim().length < 10) return setError("Please write a message of at least 10 characters.");
        setError(null);
        const href = `mailto:${email}?subject=${encodeURIComponent(`[Fridge Rescue] ${topic}`)}&body=${encodeURIComponent(message.trim().slice(0, 4000))}`;
        window.location.href = href;
      }}
    >
      <div>
        <label htmlFor="c-topic" className="label">Topic</label>
        <select id="c-topic" className="field" value={topic} onChange={(e) => setTopic(e.target.value)}>
          {["Recipe correction", "Feature idea", "Question", "Other"].map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="c-msg" className="label">Message</label>
        <textarea id="c-msg" className="field min-h-36" maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} aria-describedby={error ? "c-err" : undefined} />
      </div>
      {error && <p id="c-err" role="alert" className="text-sm font-semibold text-coral-ink">{error}</p>}
      <button type="submit" className={buttonClass("primary", "md")}><Send className="size-4" aria-hidden /> Open in my email app</button>
    </form>
  );
}
