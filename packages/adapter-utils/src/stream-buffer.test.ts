import { describe, expect, it } from "vitest";
import { StreamTokenBuffer } from "./stream-buffer.js";

describe("StreamTokenBuffer", () => {
  describe("appendDelta", () => {
    it("accumulates same-kind chunks without flushing", () => {
      const buf = new StreamTokenBuffer();
      expect(buf.appendDelta("assistant", "Hello")).toBeNull();
      expect(buf.appendDelta("assistant", " ")).toBeNull();
      expect(buf.appendDelta("assistant", "world")).toBeNull();
      expect(buf.isBuffered).toBe(true);
    });

    it("flushes when kind changes, returning the old entry", () => {
      const buf = new StreamTokenBuffer();
      buf.appendDelta("assistant", "Hello ");
      buf.appendDelta("assistant", "world");

      const flushed = buf.appendDelta("reasoning", "thinking");
      expect(flushed).not.toBeNull();
      expect(flushed!.type).toBe("assistant_message");
      expect(flushed!.content).toBe("Hello world");
    });

    it("returns null for empty text", () => {
      const buf = new StreamTokenBuffer();
      expect(buf.appendDelta("assistant", "")).toBeNull();
      expect(buf.isBuffered).toBe(false);
    });

    it("starts a new buffer when one doesn't exist", () => {
      const buf = new StreamTokenBuffer();
      buf.appendDelta("reasoning", "initial thought");
      expect(buf.isBuffered).toBe(true);
      const buffered = buf.getBuffered();
      expect(buffered?.type).toBe("reasoning_message");
      expect(buffered?.content).toBe("initial thought");
    });
  });

  describe("flush", () => {
    it("returns null when buffer is empty", () => {
      const buf = new StreamTokenBuffer();
      expect(buf.flush()).toBeNull();
    });

    it("returns the buffered entry and clears the buffer", () => {
      const buf = new StreamTokenBuffer();
      buf.appendDelta("assistant", "Hello world");
      const flushed = buf.flush();
      expect(flushed).not.toBeNull();
      expect(flushed!.type).toBe("assistant_message");
      expect(flushed!.content).toBe("Hello world");
      expect(buf.isBuffered).toBe(false);
    });

    it("pushes the entry into `entries` on flush", () => {
      const buf = new StreamTokenBuffer();
      buf.appendDelta("assistant", "Hello");
      buf.flush();
      expect(buf.entries).toHaveLength(1);
      expect(buf.entries[0].type).toBe("assistant_message");
      expect(buf.entries[0].content).toBe("Hello");
    });

    it("maps 'reasoning' kind to reasoning_message type", () => {
      const buf = new StreamTokenBuffer();
      buf.appendDelta("reasoning", "thinking");
      const flushed = buf.flush();
      expect(flushed!.type).toBe("reasoning_message");
    });
  });

  describe("getBuffered", () => {
    it("returns null when nothing is buffered", () => {
      const buf = new StreamTokenBuffer();
      expect(buf.getBuffered()).toBeNull();
    });

    it("returns a snapshot entry without consuming the buffer", () => {
      const buf = new StreamTokenBuffer();
      buf.appendDelta("assistant", "Hello");
      const peeked = buf.getBuffered();
      expect(peeked).not.toBeNull();
      expect(peeked!.content).toBe("Hello");
      // Buffer should still be present
      expect(buf.isBuffered).toBe(true);
    });
  });

  describe("isBuffered", () => {
    it("is false initially", () => {
      const buf = new StreamTokenBuffer();
      expect(buf.isBuffered).toBe(false);
    });

    it("is false after flushing with empty buffer", () => {
      const buf = new StreamTokenBuffer();
      buf.flush();
      expect(buf.isBuffered).toBe(false);
    });

    it("is true when text is accumulated", () => {
      const buf = new StreamTokenBuffer();
      buf.appendDelta("assistant", "x");
      expect(buf.isBuffered).toBe(true);
    });
  });

  describe("matchFullAndConsume (SDK prefix-match pattern)", () => {
    it("returns full content when buffer is empty", () => {
      const buf = new StreamTokenBuffer();
      const result = buf.matchFullAndConsume("assistant", "Hello world");
      expect(result).toBe("Hello world");
    });

    it("returns remainder when full content starts with buffered content", () => {
      const buf = new StreamTokenBuffer();
      buf.appendDelta("assistant", "Hello ");
      buf.appendDelta("assistant", "world");

      const remainder = buf.matchFullAndConsume("assistant", "Hello world!");
      expect(remainder).toBe("!");
    });

    it("returns null when full content equals buffered content", () => {
      const buf = new StreamTokenBuffer();
      buf.appendDelta("assistant", "Hello");
      buf.appendDelta("assistant", " world");

      const remainder = buf.matchFullAndConsume("assistant", "Hello world");
      expect(remainder).toBeNull();
    });

    it("returns full content when prefix doesn't match", () => {
      const buf = new StreamTokenBuffer();
      buf.appendDelta("assistant", "Hello");

      const remainder = buf.matchFullAndConsume("assistant", "Goodbye");
      expect(remainder).toBe("Goodbye");
    });

    it("flushes buffer when kind changes", () => {
      const buf = new StreamTokenBuffer();
      buf.appendDelta("assistant", "Hello");

      const remainder = buf.matchFullAndConsume("reasoning", "thinking");
      expect(remainder).toBe("thinking");
      expect(buf.entries).toHaveLength(1);
      expect(buf.entries[0].type).toBe("assistant_message");
    });

    it("buffers content after a successful match for future deltas", () => {
      const buf = new StreamTokenBuffer();
      buf.appendDelta("assistant", "Hello");
      buf.matchFullAndConsume("assistant", "Hello world");

      // Next delta should be appended to the updated buffer
      buf.appendDelta("assistant", "!");
      expect(buf.getBuffered()?.content).toBe("Hello world!");
    });

    it("returns null for empty full content", () => {
      const buf = new StreamTokenBuffer();
      expect(buf.matchFullAndConsume("assistant", "")).toBeNull();
    });
  });

  describe("reset", () => {
    it("clears both buffer and entries", () => {
      const buf = new StreamTokenBuffer();
      buf.appendDelta("assistant", "Hello");
      buf.flush();
      buf.appendDelta("reasoning", "thinking");

      buf.reset();

      expect(buf.isBuffered).toBe(false);
      expect(buf.entries).toHaveLength(0);
    });
  });

  describe("entries collection", () => {
    it("accumulates flushed entries in order", () => {
      const buf = new StreamTokenBuffer();
      buf.appendDelta("assistant", "Hello");
      buf.flush();
      buf.appendDelta("reasoning", "thinking");
      buf.flush();
      buf.appendDelta("assistant", "Done");
      buf.flush();

      expect(buf.entries).toHaveLength(3);
      expect(buf.entries[0]).toEqual({ type: "assistant_message", content: "Hello" });
      expect(buf.entries[1]).toEqual({ type: "reasoning_message", content: "thinking" });
      expect(buf.entries[2]).toEqual({ type: "assistant_message", content: "Done" });
    });
  });
});
