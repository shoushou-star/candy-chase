import { useState } from "react";
import actionRays from "../../assets/lobby/action-rays.svg";
import avatarSlot from "../../assets/lobby/avatar-slot.svg";
import dailyArt from "../../assets/lobby/daily-challenge-art.png";
import dailyChevron from "../../assets/lobby/chevron-daily.svg";
import menuChevron from "../../assets/lobby/chevron-menu.svg";
import lobbyBackground from "../../assets/lobby/lobby-background.png";
import lobbyBackgroundVideo from "../../assets/lobby/lobby-background.mp4";
import iconChallenges from "../../assets/lobby/icon-challenges.svg";
import iconCoins from "../../assets/lobby/icon-coins.svg";
import iconCrown from "../../assets/lobby/icon-crown-utility.svg";
import iconEnergy from "../../assets/lobby/icon-energy.svg";
import iconGems from "../../assets/lobby/icon-gems.svg";
import iconGift from "../../assets/lobby/icon-gift.svg";
import iconHalo from "../../assets/lobby/icon-halo.svg";
import iconHero from "../../assets/lobby/icon-hero.svg";
import iconMail from "../../assets/lobby/icon-mail.svg";
import iconPlay from "../../assets/lobby/icon-play.svg";
import iconSettings from "../../assets/lobby/icon-settings.svg";
import iconSongs from "../../assets/lobby/icon-songs.svg";
import levelCrown from "../../assets/lobby/icon-level-crown.svg";
import profileAvatar from "../../assets/lobby/profile-avatar.png";
import profileAvatarFrame from "../../assets/lobby/profile-avatar-frame.svg";
import unreadBadge from "../../assets/lobby/unread-badge.svg";
import "../../styles/lobby.css";
import { LobbyButton } from "./LobbyButton";
import { LobbyCurrencyCounter } from "./LobbyCurrencyCounter";
import { LobbyProfileBar } from "./LobbyProfileBar";
import type { LobbyAction, LobbyState } from "./types";
import { useLobbyAssets } from "./useLobbyAssets";

const LOBBY_ASSETS = [
  lobbyBackground, dailyArt, dailyChevron, menuChevron, actionRays,
  avatarSlot, levelCrown, profileAvatar, profileAvatarFrame,
  iconChallenges, iconCoins, iconCrown, iconEnergy, iconGems, iconGift,
  iconHalo, iconHero, iconMail, iconPlay, iconSettings, iconSongs, unreadBadge,
] as const;

type LobbyPageProps = {
  state: LobbyState;
  onAction?: (action: LobbyAction) => void;
  assetsReady?: boolean;
};

const menuButtons = [
  { action: "songs", label: "打开歌曲", title: "SONGS", icon: iconSongs },
  { action: "challenges", label: "打开挑战", title: "CHALLENGES", icon: iconChallenges },
  { action: "hero", label: "打开角色", title: "HERO", icon: iconHero },
] as const;

const utilityButtons = [
  { action: "mail", label: "打开邮件", icon: iconMail },
  { action: "gift", label: "打开礼物", icon: iconGift },
  { action: "crown", label: "打开排行榜", icon: iconCrown },
] as const;

export function LobbyPage({ state, onAction, assetsReady }: LobbyPageProps) {
  const assetStatus = useLobbyAssets(LOBBY_ASSETS);
  const isReady = assetsReady ?? assetStatus === "ready";
  const [isVideoReady, setIsVideoReady] = useState(false);

  if (!isReady) {
    return (
      <main
        aria-busy={assetsReady === false || assetStatus === "loading"}
        aria-label="游戏大厅"
        className="lobby-page lobby-page--loading"
        data-load-state={assetStatus}
      />
    );
  }

  return (
    <main aria-label="游戏大厅" className="lobby-page">
      <img alt="" className="lobby-page__background-fallback" src={lobbyBackground} />
      <video
        aria-hidden="true"
        autoPlay
        className={`lobby-page__background-video${isVideoReady ? " is-ready" : ""}`}
        loop
        muted
        onCanPlay={() => setIsVideoReady(true)}
        playsInline
        poster={lobbyBackground}
        preload="auto"
        src={lobbyBackgroundVideo}
      />
      <div aria-hidden="true" className="lobby-page__overlay" />
      <LobbyProfileBar experiencePercent={state.experiencePercent} level={state.level} playerName={state.playerName} />

      <div className="lobby-page__currencies">
        <LobbyCurrencyCounter action="coins" iconSrc={iconCoins} label="金币" onAction={onAction} value={state.currencies.coins} />
        <LobbyCurrencyCounter action="energy" iconSrc={iconEnergy} label="能量" onAction={onAction} value={state.currencies.energy} />
        <LobbyCurrencyCounter action="gems" iconSrc={iconGems} label="宝石" onAction={onAction} value={state.currencies.gems} />
      </div>

      <LobbyButton aria-label="打开设置" className="lobby-settings" onClick={() => onAction?.("settings")}>
        <img alt="" src={iconSettings} />
      </LobbyButton>

      <LobbyButton aria-label="开始游戏" className="lobby-play" onClick={() => onAction?.("play")} primary>
        <span aria-hidden="true" className="lobby-play__bottom" />
        <span aria-hidden="true" className="lobby-play__face" />
        <span aria-hidden="true" className="lobby-play__shine" />
        <img alt="" className="lobby-play__icon" src={iconPlay} />
        <span className="lobby-play__title">PLAY</span>
        <span className="lobby-play__subtitle">LET’S GROOVE!</span>
        <img alt="" className="lobby-play__rays" src={actionRays} />
      </LobbyButton>

      <div className="lobby-menu">
        {menuButtons.map((item) => (
          <LobbyButton aria-label={item.label} className="lobby-menu-button" key={item.action} onClick={() => onAction?.(item.action)}>
            <span aria-hidden="true" className="lobby-menu-button__bottom" />
            <span aria-hidden="true" className="lobby-menu-button__face" />
            <span aria-hidden="true" className="lobby-menu-button__shine" />
            <img alt="" className="lobby-menu-button__halo" src={iconHalo} />
            <img alt="" className="lobby-menu-button__icon" src={item.icon} />
            <span className="lobby-menu-button__title">{item.title}</span>
            <img alt="" className="lobby-menu-button__chevron" src={menuChevron} />
          </LobbyButton>
        ))}
      </div>

      <LobbyButton aria-label="打开每日挑战" className="lobby-daily" onClick={() => onAction?.("daily")}>
        <span aria-hidden="true" className="lobby-daily__bottom" />
        <span aria-hidden="true" className="lobby-daily__face" />
        <span aria-hidden="true" className="lobby-daily__shine" />
        <img alt="" className="lobby-daily__art" src={dailyArt} />
        <span className="lobby-daily__title">DAILY<br />CHALLENGE</span>
        <img alt="" className="lobby-daily__chevron" src={dailyChevron} />
        <span aria-hidden="true" className="lobby-daily__progress">
          <i className="is-active" /><i /><i /><i />
        </span>
      </LobbyButton>

      <div className="lobby-utilities">
        {utilityButtons.map((item) => (
          <LobbyButton aria-label={item.label} className="lobby-utility" key={item.action} onClick={() => onAction?.(item.action)}>
            <span aria-hidden="true" className="lobby-utility__bottom" />
            <span aria-hidden="true" className="lobby-utility__face" />
            <span aria-hidden="true" className="lobby-utility__shine" />
            <img alt="" className="lobby-utility__icon" src={item.icon} />
            {item.action === "mail" && state.hasUnreadMail && (
              <img aria-label="有未读邮件" className="lobby-utility__badge" src={unreadBadge} />
            )}
          </LobbyButton>
        ))}
      </div>
    </main>
  );
}
