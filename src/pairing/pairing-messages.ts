import type { PairingChannel } from "./pairing-store.js";
import { formatCliCommand } from "../cli/command-format.js";

export function buildPairingReply(params: {
  channel: PairingChannel;
  idLine: string;
  code: string;
}): string {
  const { channel, idLine, code } = params;
  const capitalizedChannel = channel.charAt(0).toUpperCase() + channel.slice(1);
  return [
    `🦞 Welcome to OpenClaw!`,
    "",
    `I'm your personal AI assistant, but I haven't been introduced to you on ${capitalizedChannel} yet.`,
    "",
    `Your secure pairing code is: **${code}**`,
    "",
    "To grant me access, please tell the bot owner to run this command in their terminal:",
    formatCliCommand(`openclaw pairing approve ${channel} ${code}`),
    "",
    "Once approved, I'll be ready to help you here!",
  ].join("\n");
}
