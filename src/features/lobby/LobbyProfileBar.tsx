import avatarSlot from "../../assets/lobby/avatar-slot.svg";
import levelCrown from "../../assets/lobby/icon-level-crown.svg";
import profileAvatar from "../../assets/lobby/profile-avatar.png";
import profileAvatarFrame from "../../assets/lobby/profile-avatar-frame.svg";
import type { LobbyState } from "./types";

type LobbyProfileBarProps = Pick<LobbyState, "playerName" | "level" | "experiencePercent">;

export function LobbyProfileBar({ playerName, level, experiencePercent }: LobbyProfileBarProps) {
  return (
    <section aria-label="玩家资料" className="lobby-profile">
      <img alt="" className="lobby-profile__avatar-slot" src={avatarSlot} />
      <img alt="" className="lobby-profile__avatar-frame" src={profileAvatarFrame} />
      <img alt="玩家头像" className="lobby-profile__avatar" src={profileAvatar} />
      <strong className="lobby-profile__name">{playerName}</strong>
      <img alt="" className="lobby-profile__crown" src={levelCrown} />
      <span className="lobby-profile__level">{`Lv. ${level}`}</span>
      <span aria-hidden="true" className="lobby-profile__progress-track">
        <span
          className="lobby-profile__progress-value"
          style={{ width: `${Math.max(0, Math.min(100, experiencePercent))}%` }}
        />
      </span>
    </section>
  );
}
