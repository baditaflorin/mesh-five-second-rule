import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMockRoom } from "@baditaflorin/mesh-common/testing";
import { Feature, PROMPTS, promptForSlot } from "../../src/Feature";
import { config } from "../../src/config";

describe("Five Second Rule", () => {
  it("selects prompts deterministically for every peer", () => {
    expect(promptForSlot(0)).toBe(PROMPTS[0]);
    expect(promptForSlot(PROMPTS.length)).toBe(PROMPTS[0]);
    expect(promptForSlot(3)).toBe(PROMPTS[3]);
  });

  it("renders the game while connected", () => {
    render(<Feature room={createMockRoom()} config={config} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Five seconds");
    expect(screen.getByPlaceholderText("Add a name for this room")).toBeInTheDocument();
  });

  it("keeps a useful joining state before the room exists", () => {
    render(<Feature room={null} config={config} />);
    expect(screen.getByText("Joining room…")).toBeInTheDocument();
  });
});
