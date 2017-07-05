# <img src=https://hola.org/img/logo.png alt="Hola!"> JS Challenge Summer 2017: JSDash

Welcome to Hola programming challenge!

1. First prize: 3000 USD.
2. Second prize: 2000 USD.
3. Third prize: 1000 USD.
4. If you email the link to this page to someone, with challengejs@hola.org in CC, and they enter the competition and win a prize, you will receive half the amount they get (only the first referrer per participant).

## Rules

* Submit your solution to our [form](https://hola.org/challenges/jsdash). Do not send solutions by e-mail!
* Submission deadline: **July 31, 2017**, 23:59:59 UTC.
* Preliminary results will be published on **August 7, 2017**, and final results on **August 15, 2017**.
* You may submit more than once. Only your latest submission, as long as it's still before the deadline, will be evaluated.
* We will use **Node.js v8.1.3** (current at the time of this publication) for testing. You can use any language features supported by the interpreter in its default configuration.
* Your code must all be in a **single JS file**.
* Your submission must be in JS. If you prefer CoffeeScript or similar, translate to JS before submitting.
* If your JS file is generated, minified and/or compiled from a different language like CoffeeScript, please submit an archive with the complete sources, and possibly a description of your approach. We will publish it, but won't test it.
* It is **not allowed to require any JS modules**, not even the standard ones built into Node.js.
* We need to know your full name, but we can publish your solution under a pseudonym instead, if you prefer. We will not publish your email address.
* Questions about the problem statement? Send them to challengejs@hola.org.

## JSDash

Let's play an ASCII game! You will no doubt recognize a clone of a timeless classic first released in 1984.

Your goal in this contest is to write a program that plays this game, making decisions instead of a human player. The game will be played in real time, so your script will have as much time for making decisions as a human has.

We recommend that you run [game/jsdash.js](game/jsdash.js) and play a few times before reading further. (Note: we developed and tested the game with xterm on Linux. It may or may not work in other environments.)

See also the [Russian version](https://habrahabr.ru/company/hola/blog/332176/) of this page.

### The game

You can move with arrow keys in four directions. The green `A` marks your position in the cave. You can move through empty space and dirt (`:`), push boulders (`O`) horizontally into empty space, and collect diamonds (`*`). Brick (`+`) and steel (`#`) walls are impassable. Boulders and diamonds fall when left without support, and they roll off brick walls and each other. Falling objects kill you. Butterflies (animated between `/|\-`) explode when you touch them, when hit by a falling object, or when confined to a space where they cannot move. An exploding butterfly consumes all materials except steel and can kill you, but if you survive an explosion, it turns into diamonds which you can collect.

You score 1 point for every diamond collected. If you collect 3 diamonds with no more than 2 seconds between each two, you score a streak and get extra 3 points on top of that. If you keep extending your streak without stopping for more than 2 seconds between diamonds, you score 5 extra points when you reach 5, 7 extra points (on top of all the previous rewards) when you reach 7, and so on for every prime number thereafter. Also, you score 10 points for killing a butterfly and surviving.

The time limit is 2 minutes. You can end the game sooner by pressing Q, Esc or Ctrl-C, and you keep your score if you do that. Press P if you want to pause the game.

The remaining time, score, and streak messages are shown in the status line below the playing field.

Our game mechanics are mostly faithful to the 1984 original (which is studied in great detail on [Martijn's Boulder Dash fan site](http://www.bd-fans.com/FanStuff.html#Programming)), with fewer types of objects for simplicity. The biggest difference is scoring, described above, and the fact that there is no exit on the level. The goal is simply to score as many points as you can before you get killed or the time runs out. Please refer to the source code of the [game.js](game/game.js) module if you're interested in the exact behavior of the game objects.

### Solutions

A solution is a Node.js module with no dependencies. It must export a single function:

```javascript
play(screen)
```

The module will be loaded, and this function will be called once, with the initial state of the game screen passed into the `screen` argument. It will be an array of strings, one for each row of the screen, top to bottom, including the status line. The strings will contain exactly what you see on the screen while playing, just without the ANSI escape sequences for colors (try the `--no-color` command line option to see the game that way on the console).

The `play` function must be a generator. To make a move, it should yield `'u'`, `'d'`, `'r'` or `'l'` to move up, down, right or left, respectively. It can also yield `'q'` or simply return to end the game sooner (it will then keep the accumulated score). Yielding anything else means that you decide to stay in place for now. It is legal to attempt an impossible move (such as walking into a wall): the character will simply stay in place. After every yield, the contents of the `screen` array change, and your code can examine it again to see the current state.

If your function throws an exception at any time, the game ends, and no points are scored in this game. This does not disqualify your solution from playing other levels.

Your script runs in a child process. It does not stop the game from updating. Even if it hangs, the game will proceed (and the character will stay in place).

The game updates its state every 100 ms. If your `play` function yields a command at least that often, the character moves 10 times per second. The function then blocks on the `yield` statement until the end of the 100 ms round. If the function takes longer than 100 ms between yields, it starts missing frames. In this case, the character stays in place for the rounds when the play function did not yield a command. It also means that your function won't see every state of the screen (some frames will be dropped). For example, if the script takes 250 ms between two yields, two frames are dropped, and the function never sees those two intermediate screen states; the character stays still for two rounds when it could have moved if the script had been faster. After that, the function blocks for 50ms until the end of the round, and the command it yielded is executed.

See [game/example.js](game/example.js) for a very simple example of a valid playing script. Every round, it finds all possible moves (into empty spaces, dirt or diamonds, as well as pushing boulders), and chooses one of them randomly. Most of the time, though, it gets into trouble and dies rather soon.

### Testing

The [jsdash.js](game/jsdash.js) script that we supply is not just an interactive game, but a powerful testing tool. Run it with `--help` to see what it can do.

We are going to run every submission we receive on at least 20 randomly generated levels. We reserve the right to increase that number (for all participants) if we need to distinguish better between leaders in case of a close call. The solution that scores most total points on all levels, wins the competition. If there's still a tie between leaders, we reserve the right to choose the solution that was submitted first.

We will use the same set of pseudo-random seeds for every submission to make sure that the generated levels are the same for everybody. When we run your submission, we will use the default settings:


```
jsdash.js --ai=submission.js --log=log.json
```

However, you might want to explore the various command line options which might help you test and debug your solution.

The log files of every script playing every test level will be published afterwards. You can replay those logged games by running:

```
jsdash.js --replay=log.json
```

All submissions will be tested on Ubuntu 14.04 (amd64) on a [c3.large](https://aws.amazon.com/ru/ec2/instance-types/#c3) Amazon AWS instance, one after another, with no other load on the machine.

Bugs reported by participants are getting fixed; please follow [game/CHANGELOG.md](game/CHANGELOG.md) to stay updated.

### Submitting your solution

Please submit your solutions using [this form](https://hola.org/challenges/jsdash). We don't accept submissions by email.

Some solutions might contain code or data that is generated, minified or translated from another language; therefore we require that the source code be submitted as well. If the code or data is generated, please include the generator; if it's minified, include the original version; if it's compiled from a different language such as CoffeeScript, include the original code. We also appreciate if you include a brief README file with some explanation of your approach (in English). Please submit the above as a tar.gz, tar.bz2, or zip archive. The contents of this archive will be published, but won't be tested.

We have set the maximum size of the submitted script (not including the source archive) to 64 MiB. This is an arbitrary number chosen simply to prevent someone from filling our disks with a single submission. If your solution is legitimately bigger than 64 MiB, please take contact, and we'll make a reasonable increase.

If you have questions about this problem statement, or trouble submitting your solution, please contact challengejs@hola.org.

**Good luck to all the participants!**
