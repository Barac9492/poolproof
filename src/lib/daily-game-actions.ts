"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import {
  createChallengeRoom,
  getChallengeLeaderboard,
  saveChallengeScore,
} from "@/lib/db";

type ScoreInput = {
  roomId?: string;
  displayName?: string;
  score: number;
  total: number;
  pattern: string;
};

function cleanName(value?: string) {
  return value?.trim().replace(/\s+/g, " ").slice(0, 16) || "";
}

function validateScore(input: ScoreInput) {
  if (!Number.isInteger(input.score) || !Number.isInteger(input.total)) throw new Error("invalid score");
  if (input.total < 1 || input.total > 20 || input.score < 0 || input.score > input.total) throw new Error("invalid score");
  if (!/^(?:🟩|🟥)+$/u.test(input.pattern) || [...input.pattern].length !== input.total) throw new Error("invalid pattern");
}

async function visitorId() {
  const jar = await cookies();
  let id = jar.get("pp_visitor")?.value;
  if (!id) {
    id = crypto.randomUUID();
    jar.set("pp_visitor", id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return id;
}

function publicRows(rows: Awaited<ReturnType<typeof getChallengeLeaderboard>>) {
  return rows.map((row) => ({
    name: row.display_name,
    score: Number(row.score),
    total: Number(row.total),
    pattern: row.pattern,
  }));
}

export async function createChallengeRoomAction(input: ScoreInput) {
  validateScore(input);
  const roomId = crypto.randomBytes(6).toString("base64url");
  const id = await visitorId();
  const displayName = cleanName(input.displayName) || `익명 ${id.slice(0, 4)}`;
  await createChallengeRoom(roomId);
  await saveChallengeScore({ ...input, roomId, visitorId: id, displayName });
  return { roomId, leaderboard: publicRows(await getChallengeLeaderboard(roomId)) };
}

export async function submitChallengeScoreAction(input: ScoreInput & { roomId: string }) {
  validateScore(input);
  if (!/^[A-Za-z0-9_-]{8}$/.test(input.roomId)) throw new Error("invalid room");
  const id = await visitorId();
  const displayName = cleanName(input.displayName) || `익명 ${id.slice(0, 4)}`;
  await saveChallengeScore({ ...input, visitorId: id, displayName });
  return { roomId: input.roomId, leaderboard: publicRows(await getChallengeLeaderboard(input.roomId)) };
}
