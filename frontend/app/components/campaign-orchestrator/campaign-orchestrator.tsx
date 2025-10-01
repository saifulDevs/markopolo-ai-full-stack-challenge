import React,  {  useCallback, useEffect, useMemo, useRef, useState } from "react";

type DataSourceId = "gtm" | "facebook_pixel" | "google_ads_tag";
type ChannelId = "email" | "sms" | "whatsapp" | "ads";

type CampaignPayload = {
  campaignId: number;
  generatedAt: string;
  rightTime: {
    send_at: string;
    time_zone: string;
    window_minutes: number;
    rationale: string;
  };
  rightChannel: {
    id: ChannelId;
    name: string;
    reason: string;
    supportingSignals: string[];
  };
  rightMessage: {
    headline: string;
    body: string;
    cta: string;
    preview: string;
    tone: string;
  };
  rightAudience: {
    age_range?: string;
    location?: string;
    interests?: string[];
    behaviors?: string[];
    lifecycle_stage?: string;
    preferred_device?: string;
  };
  dataSources: Record<string, unknown>;
  metrics: {
    expected_lift: string;
    confidence_score: number;
    sample_size: number;
  };
};

type ConnectionStatus = "disconnected" | "connecting" | "connected";

const DATA_SOURCES: Array<{
  id: DataSourceId;
  label: string;
  description: string;
}> = [
  {
    id: "gtm",
    label: "Google Tag Manager (GTM)",
    description: "Onsite events like page views and funnels",
  },
  {
    id: "facebook_pixel",
    label: "Facebook Pixel",
    description: "Paid social conversions and remarketing events",
  },
  {
    id: "google_ads_tag",
    label: "Google Ads",
    description: "Campaign spend, conversions and CTR",
  },
];

const CHANNELS: Array<{
  id: ChannelId;
  label: string;
  description: string;
}> = [
  {
    id: "email",
    label: "Email",
    description: "Rich storytelling with dynamic product blocks",
  },
  {
    id: "sms",
    label: "SMS",
    description: "Short form alerts with instant click-through",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Conversational follow-up with interactive elements",
  },
  {
    id: "ads",
    label: "Ads",
    description: "Dynamic paid placements that mirror site experience",
  },
];

type ThreadMessage =
  | {
      id: string;
      role: "user";
      prompt: string;
      createdAt: string;
    }
  | {
      id: string;
      role: "assistant";
      payload: CampaignPayload;
    };

const MAX_MESSAGES = 20;

function formatTimestamp(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const palette: Record<ConnectionStatus, string> = {
    disconnected: "bg-gray-400",
    connecting: "bg-amber-400",
    connected: "bg-emerald-500",
  };

  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium">
      <span className={`h-2.5 w-2.5 rounded-full ${palette[status]}`} aria-hidden />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function PreferencesList<T extends string>({
  items,
  selected,
  onToggle,
  name,
}: {
  items: Array<{ id: T; label: string; description: string }>;
  selected: T[];
  onToggle: (id: T) => void;
  name: string;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {name}
      </legend>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map(({ id, label, description }) => {
          const checked = selected.includes(id);
          return (
            <label
              key={id}
              className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 text-sm transition hover:border-blue-400 hover:shadow-sm dark:border-gray-700 dark:hover:border-blue-500 ${
                checked
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                  : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={checked}
                  onChange={() => onToggle(id)}
                />
                <span className="font-medium">{label}</span>
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {description}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function MessageCard({ payload }: { payload: CampaignPayload }) {
  const { rightTime, rightChannel, rightMessage, rightAudience, metrics } = payload;

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition dark:border-gray-700 dark:bg-gray-900">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Campaign #{payload.campaignId} · {rightChannel.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {rightChannel.reason}
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium uppercase text-blue-600 dark:bg-blue-500/20 dark:text-blue-200">
          Generated {formatTimestamp(payload.generatedAt)}
        </span>
      </header>

      <dl className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Right Time
          </dt>
          <dd className="text-sm text-gray-800 dark:text-gray-200">
            {formatTimestamp(rightTime.send_at)} ({rightTime.time_zone}) · {rightTime.window_minutes} min window
          </dd>
          <p className="text-xs text-gray-500 dark:text-gray-400">{rightTime.rationale}</p>
        </div>

        <div className="space-y-1">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Success Forecast
          </dt>
          <dd className="text-sm text-gray-800 dark:text-gray-200">
            Expected lift {metrics.expected_lift} · Confidence {metrics.confidence_score} · Sample {metrics.sample_size.toLocaleString()}
          </dd>
        </div>
      </dl>

      <section className="mt-4 space-y-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Right Message
        </h4>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {rightMessage.headline}
        </p>
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {rightMessage.body}
        </p>
        <div className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-300">
          CTA: {rightMessage.cta} · Tone: {rightMessage.tone}
        </div>
        {rightChannel.supportingSignals.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {rightChannel.supportingSignals.map((signal) => (
              <li
                key={signal}
                className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
              >
                {signal}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Right Audience
          </h4>
          <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {rightAudience.location && <li>Location · {rightAudience.location}</li>}
            {rightAudience.age_range && <li>Age · {rightAudience.age_range}</li>}
            {rightAudience.lifecycle_stage && <li>Lifecycle · {rightAudience.lifecycle_stage}</li>}
            {rightAudience.preferred_device && <li>Preferred device · {rightAudience.preferred_device}</li>}
            {rightAudience.interests && rightAudience.interests.length > 0 && (
              <li>Interests · {rightAudience.interests.join(", ")}</li>
            )}
            {rightAudience.behaviors && rightAudience.behaviors.length > 0 && (
              <li>Behaviors · {rightAudience.behaviors.join(", ")}</li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Data Signals
          </h4>
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-gray-950/5 p-3 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-200">
            {JSON.stringify(payload.dataSources, null, 2)}
          </pre>
        </div>
      </section>
    </article>
  );
}

function UserMessageCard({ prompt, createdAt }: { prompt: string; createdAt: string }) {
  return (
    <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 shadow-sm dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-50">
      <header className="flex items-center justify-between">
        <span className="font-semibold uppercase tracking-wide">You</span>
        <span className="text-xs text-blue-700/80 dark:text-blue-200/70">
          {formatTimestamp(createdAt)}
        </span>
      </header>
      <p className="mt-2 whitespace-pre-wrap leading-relaxed">{prompt}</p>
    </article>
  );
}

export function CampaignOrchestrator() {
  const [selectedSources, setSelectedSources] = useState<DataSourceId[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<ChannelId[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  const wsRef = useRef<WebSocket | null>(null);

  const websocketUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "ws://localhost:8000/ws";
    }
    const override = (import.meta.env.VITE_WS_URL as string | undefined) ?? "ws://localhost:8000/ws";
    if (override) {
      return override;
    }
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}/ws`;
  }, []);

  const sendPreferences = useCallback(() => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    const payload = {
      dataSources: selectedSources,
      channels: selectedChannels,
    };
    socket.send(JSON.stringify(payload));
  }, [selectedSources, selectedChannels]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    disconnect();

    setError(null);
    setStatus("connecting");

    const socket = new WebSocket(websocketUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setStatus("connected");
      sendPreferences();
    };

    socket.onmessage = (event) => {
      try {
        const payload: CampaignPayload = JSON.parse(event.data);
        setMessages((prev) =>
          [
            {
              id: `${payload.campaignId}-${payload.generatedAt}`,
              role: "assistant",
              payload,
            },
            ...prev,
          ].slice(0, MAX_MESSAGES),
        );
      } catch (err) {
        console.error("Failed to parse payload", err);
        setError("Received an unexpected payload from the server.");
      }
    };

    socket.onerror = () => {
      setError("WebSocket error. Please check that the backend is running.");
      setStatus("disconnected");
    };

    socket.onclose = () => {
      setStatus("disconnected");
    };
  }, [disconnect, sendPreferences, websocketUrl]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (status === "connected") {
      sendPreferences();
    }
  }, [status, sendPreferences]);

  const toggleSource = useCallback(
    (id: DataSourceId) => {
      setSelectedSources((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      );
    },
    [],
  );

  const toggleChannel = useCallback(
    (id: ChannelId) => {
      setSelectedChannels((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      );
    },
    [],
  );

  const handlePromptSubmit = useCallback(
    (event:  React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmed = prompt.trim();
      if (!trimmed) {
        return;
      }

      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        setError("Connection is not ready. Please reconnect and try again.");
        return;
      }

      setError(null);

      const outboundPayload = {
        prompt: trimmed,
        dataSources: selectedSources,
        channels: selectedChannels,
      };

      socket.send(JSON.stringify(outboundPayload));

      const createdAt = new Date().toISOString();
      setMessages((prev) =>
        [
          {
            id: `user-${createdAt}`,
            role: "user",
            prompt: trimmed,
            createdAt,
          },
          ...prev,
        ].slice(0, MAX_MESSAGES),
      );

      setPrompt("");
    },
    [prompt, selectedChannels, selectedSources],
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-10">
      <header className="space-y-4">
        <p className="text-sm font-medium text-blue-600 dark:text-blue-300">
          Intelligent Campaign Planner
        </p>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-50">
          Orchestrate the right message, channel, and moment
        </h1>
        <p className="max-w-3xl text-sm text-gray-600 dark:text-gray-300">
          Select the data sources that power your insights, choose the channels you want to
          activate, and watch the orchestrator stream real-time recommendations for your next
          campaign.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={status} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={connect}
              disabled={
                status === "connecting" ||
                selectedSources.length === 0 ||
                selectedChannels.length === 0
              }
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {status === "connected" ? "Reconnect" : "Start streaming"}
            </button>
            <button
              type="button"
              onClick={disconnect}
              disabled={status === "disconnected"}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Disconnect
            </button>
            <button
              type="button"
              onClick={() => setMessages([])}
              className="rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Clear transcript
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}
      </header>

      <section className="grid gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 md:grid-cols-2">
        <PreferencesList
          items={DATA_SOURCES}
          selected={selectedSources}
          onToggle={toggleSource}
          name="Data sources"
        />
        <PreferencesList
          items={CHANNELS}
          selected={selectedChannels}
          onToggle={toggleChannel}
          name="Channels"
        />
      </section>

      <section className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Real-time campaign feed
          </h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Showing up to {MAX_MESSAGES} most recent payloads
          </span>
        </div>

        {messages.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <span>Start streaming to see campaign recommendations appear here.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) =>
              message.role === "assistant" ? (
                <MessageCard key={message.id} payload={message.payload} />
              ) : (
                <UserMessageCard key={message.id} prompt={message.prompt} createdAt={message.createdAt} />
              ),
            )}
          </div>
        )}

         <form action="#" className="relative" onSubmit={handlePromptSubmit}>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <label htmlFor="comment" className="sr-only">
              Add your comment
            </label>
            <textarea
             id="campaign-orchestrator-prompt"
              rows={3}
            placeholder="Ask the orchestrator to generate the next campaign..."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            disabled={status !== "connected"}
              className="block w-full resize-none bg-transparent px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6 dark:text-white dark:placeholder:text-gray-500"
              defaultValue={''}
            />

            {/* Spacer element to match the height of the toolbar */}
            <div aria-hidden="true" className="py-2">
              {/* Matches height of button in toolbar (1px border + 36px content height) */}
              <div className="py-px">
                <div className="h-9" />
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex justify-end  py-2 pr-2 pl-3">
        
            <div className="shrink-0">
             <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={status !== "connected" || prompt.trim().length === 0}
            >
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-arrow-up tabler-icon"><path d="M12 5l0 14"></path><path d="M18 11l-6 -6"></path><path d="M6 11l6 -6"></path></svg>
            </button>
            </div>
          </div>
        </form>
      
      </section>
    </main>
  );
}
