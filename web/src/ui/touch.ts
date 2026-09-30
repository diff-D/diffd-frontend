import { isTouch } from "../state/device";

/** "tap" on a touch screen, "click" elsewhere: the word for pressing something. */
export const act = (): string => (isTouch() ? "tap" : "click");
