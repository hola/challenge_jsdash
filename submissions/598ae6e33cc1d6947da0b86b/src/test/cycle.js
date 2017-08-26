let game = new Game('Тест');
game.State.addCommand('lrlrlrlrlrl');
console.log(game.State.detectCycle())