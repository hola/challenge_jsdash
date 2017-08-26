import { Bot } from "./bot";

const play = function* (screen: string[]): IterableIterator<string> {
  const bot = new Bot(screen);
  while (true) {
    yield bot.play();
  }
}

module.exports.play = play;