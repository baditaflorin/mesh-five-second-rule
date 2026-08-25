import { useEffect, useMemo, useState } from "react";
import {
  MeshButton,
  MeshLaunch,
  MeshNameInput,
  MeshPresence,
  MeshStatusPill,
  MeshSurface,
  createClockSync,
  useNamedPeer,
  useReactions,
  useRoster,
  useRotatingTurn,
  useTone,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

const TURN_MS = 5_000;

export const PROMPTS = [
  "Name three things you would pack for a surprise trip.",
  "Name three foods that should never be eaten cold.",
  "Name three songs that instantly lift your mood.",
  "Name three things you could teach in one minute.",
  "Name three tiny wins worth celebrating today.",
  "Name three fictional worlds you would visit.",
  "Name three things that belong in a perfect weekend.",
  "Name three words that make a great team.",
] as const;

export function promptForSlot(slotId: number): string {
  return PROMPTS[Math.abs(slotId) % PROMPTS.length] ?? PROMPTS[0];
}

function displayPeer(
  peerId: string | null,
  nameOf: (peerId: string) => string | undefined,
): string {
  if (!peerId) return "Waiting for players";
  return nameOf(peerId) || `Player ${peerId.slice(0, 4)}`;
}

type Props = { room: YRoom | null; config: MeshConfig };

/** A fully-derived round: peers agree on the turn from roster + mesh clock. */
export function Feature({ room, config }: Props) {
  const namedPeer = useNamedPeer(config, room);
  const roster = useRoster(room);
  const tone = useTone({ masterGain: 0.18 });
  const clock = useMemo(() => createClockSync(room?.provider ?? null), [room?.provider]);

  useEffect(() => () => clock.destroy(), [clock]);

  const turn = useRotatingTurn(room, clock, { slotMs: TURN_MS, order: "shuffle" });
  const roundId = `round-${turn.slotId}`;
  const reactions = useReactions(room, "five-second-rule");
  const [revision, refresh] = useState(0);

  useEffect(() => {
    if (!room) return;
    const answers = room.doc.getMap<{ peerId: string; slotId: number; at: number }>(
      "mesh-five-second-rule:answers",
    );
    const onChange = () => refresh((version) => version + 1);
    answers.observe(onChange);
    return () => answers.unobserve(onChange);
  }, [room]);

  const answer = room?.doc
    .getMap<{ peerId: string; slotId: number; at: number }>("mesh-five-second-rule:answers")
    .get(roundId);
  void revision;

  const currentName = displayPeer(turn.currentPeerId, namedPeer.nameOf);
  const nextName = displayPeer(turn.nextPeerId, namedPeer.nameOf);
  const playerCount = Math.max(1, roster.present.length);
  const currentTurnLabel = turn.isMyTurn
    ? "Your turn"
    : turn.currentPeerId
      ? `${currentName}'s turn`
      : "Waiting for players";
  const isAnswered = answer?.peerId === room?.peerId;
  const progress = Math.round(turn.progress * 100);
  const cheers = reactions.countsFor(roundId).fire ?? 0;

  const markAnswered = () => {
    if (!room || !turn.isMyTurn || answer) return;
    room.doc.getMap("mesh-five-second-rule:answers").set(roundId, {
      peerId: room.peerId,
      slotId: turn.slotId,
      at: Date.now(),
    });
    tone.sequence([
      { freq: 660, type: "triangle", duration: 0.08 },
      { freq: 880, type: "triangle", duration: 0.14, at: 0.1 },
    ]);
  };

  const cheer = () => {
    if (!room) return;
    reactions.toggle(roundId, "fire");
    tone.play({ freq: 740, glideTo: 980, type: "sine", duration: 0.12 });
  };

  const focusName = () => {
    document.getElementById("identity-title")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    document.querySelector<HTMLInputElement>(".mesh-name-input-field")?.focus();
  };

  const launchAction = turn.isMyTurn
    ? {
        label: isAnswered
          ? "Answer locked in"
          : answer
            ? "This turn is locked"
            : "I said all three",
        onClick: markAnswered,
        disabled: !room || !!answer,
      }
    : {
        label: room ? "Cheer this turn" : "Preparing the round",
        onClick: cheer,
        disabled: !room,
      };

  return (
    <main className="rule-page">
      <MeshLaunch
        className="rule-launch"
        eyebrow="A five-second room game"
        heading={
          <>
            Five seconds.
            <br />
            Say three things.
          </>
        }
        promise="A fast, generous prompt game that rotates fairly between everyone here. No host, accounts, or scorekeeping drama."
        presence={
          <MeshPresence
            count={playerCount}
            state={room ? "connected" : "connecting"}
            label={playerCount === 1 ? "player in this room" : "players in this room"}
            announce="polite"
          />
        }
        preview={
          <div className="launch-round-preview" aria-label="Live round preview">
            <div className="launch-round-preview-meta">
              <MeshStatusPill tone={turn.isMyTurn ? "live" : "info"} dot>
                {currentTurnLabel}
              </MeshStatusPill>
              <span>{Math.max(0, Math.ceil(turn.msToNextTurn / 1000))} sec</span>
            </div>
            <strong>{promptForSlot(turn.slotId)}</strong>
            <div className="launch-round-preview-track" aria-hidden="true">
              <span style={{ transform: `scaleX(${1 - turn.progress})` }} />
            </div>
          </div>
        }
        primaryAction={launchAction}
        secondaryAction={{ label: "Set my name", onClick: focusName }}
        loading={!room}
        connectionHint={
          room
            ? undefined
            : "Joining the room now. The live prompt stays visible while it connects."
        }
      />

      <section className="game-grid" aria-label="Five second game">
        <MeshSurface
          as="section"
          className="round-card"
          tone="accent"
          padding="lg"
          id="five-second-round"
          tabIndex={-1}
          aria-live="polite"
        >
          <div className="round-meta">
            <MeshStatusPill tone="neutral" dot>
              Round {Math.max(1, turn.slotId)}
            </MeshStatusPill>
            <MeshStatusPill tone={turn.msToNextTurn > 0 ? "warning" : "info"}>
              {turn.msToNextTurn > 0
                ? `${Math.ceil(turn.msToNextTurn / 1000)} seconds`
                : "Switching"}
            </MeshStatusPill>
          </div>
          <div
            className="timer-track"
            aria-label={`${Math.ceil(turn.msToNextTurn / 1000)} seconds remaining`}
          >
            <span className="timer-fill" style={{ transform: `scaleX(${1 - turn.progress})` }} />
          </div>
          <p className="turn-label">{currentTurnLabel}</p>
          <h2>{promptForSlot(turn.slotId)}</h2>
          <p className="round-instruction">
            {turn.isMyTurn
              ? "Go! Say three answers out loud before the sand runs out."
              : `Listen in, then give ${currentName} a little encouragement.`}
          </p>

          {turn.isMyTurn ? (
            <MeshButton
              className="answer-button"
              variant="primary"
              size="lg"
              onClick={markAnswered}
              disabled={!room || !!answer}
            >
              {isAnswered
                ? "Nice one — next player soon"
                : answer
                  ? "Answer locked in"
                  : "I said all three!"}
            </MeshButton>
          ) : (
            <MeshButton
              className="cheer-button"
              onClick={cheer}
              variant="secondary"
              size="lg"
              disabled={!room}
              aria-pressed={reactions.myReactionsOn(roundId).has("fire")}
            >
              {reactions.myReactionsOn(roundId).has("fire") ? "You cheered" : "Cheer them on"}
              {cheers > 0 ? ` · ${cheers} cheer${cheers === 1 ? "" : "s"}` : ""}
            </MeshButton>
          )}
        </MeshSurface>

        <aside className="side-stack">
          <MeshSurface
            as="section"
            className="identity-card"
            tone="raised"
            padding="md"
            aria-labelledby="identity-title"
          >
            <p className="card-label">You are playing as</p>
            <h2 id="identity-title">{namedPeer.name || "Unnamed player"}</h2>
            <MeshNameInput
              label="Your display name"
              value={namedPeer.name}
              onChange={namedPeer.setName}
              placeholder="Add a name for this room"
              maxLength={32}
              showCounter
            />
          </MeshSurface>

          <MeshSurface
            as="section"
            className="rotation-card"
            tone="quiet"
            padding="md"
            aria-labelledby="rotation-title"
          >
            <p className="card-label">Next up</p>
            <h2 id="rotation-title">{nextName}</h2>
            <ol className="player-list">
              {turn.order.map((peerId) => (
                <li className={peerId === turn.currentPeerId ? "is-current" : ""} key={peerId}>
                  {displayPeer(peerId, namedPeer.nameOf)}
                  {peerId === turn.currentPeerId && <span>now</span>}
                </li>
              ))}
            </ol>
          </MeshSurface>
        </aside>
      </section>

      <p className="rule-footer">
        Prompt changes in {Math.ceil(turn.msToNextTurn / 1000)} · {progress}% through this turn
      </p>
    </main>
  );
}
