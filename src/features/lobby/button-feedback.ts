const CLICK_ANIMATION_CLASS = "is-click-animating";

export function startLobbyClickAnimation(button: HTMLButtonElement) {
  button.classList.remove(CLICK_ANIMATION_CLASS);
  void button.offsetWidth;
  button.classList.add(CLICK_ANIMATION_CLASS);
}

export function finishLobbyClickAnimation(button: HTMLButtonElement) {
  button.classList.remove(CLICK_ANIMATION_CLASS);
}
