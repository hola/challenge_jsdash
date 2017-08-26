let assert = require('assert');
let { SmartThing, Stone, Up, Left, Right, Down, Butterfly, World, Hold } = require('./ai');
let dirmap = { 'u': 0, 'r':1, 'd':2, 'l':3, ' ': 4};

describe('Falling', () => {

    it('simple fall', () => {
        let origin =
            ["#########",
             "#*  O   #",
             "#       #",
             "#       #",
             "#########"];
        let world = new World(origin);
        world.update(Up);
        world.update(Up);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            ["#########",
             "#       #",
             "#       #",
             "#*  O   #",
             "#########"].join('')
        );

        world.back();
        world.back();

        result = world.generate(Up);
        assert.equal(result.join(''),origin.join(''));
    });

    it('top on sand', () => {
        let origin = ["#########",
            "#*  O   #",
            "#       #",
            "#   :   #",
            "#       #",
            "#       #",
            "#########"];
        let world = new World(origin);
        world.update(Up);
        world.update(Up);
        world.update(Up);
        world.update(Up);

        let result = world.generate();
        assert.equal(result.join(''),
            ["#########",
                "#       #",
                "#   O   #",
                "#   :   #",
                "#       #",
                "#*      #",
                "#########"].join('')
        );

        world.back();
        world.back();
        world.back();
        world.back();

        result = world.generate();
        assert.equal(result.join(''),origin.join(''));
    });

    it('roll on brick', () => {
        let origin = [
            "#########",
            "#*  O   #",
            "#       #",
            "#   +   #",
            "#       #",
            "#       #",
            "#########"];
        let world = new World(origin);
        world.update(Up);
        world.update(Up);
        world.update(Up);
        world.update(Up);

        let result = world.generate(Up);
        assert.equal(result.join(''),
               ["#########",
                "#       #",
                "#       #",
                "#   +   #",
                "#  O    #",
                "#*      #",
                "#########"].join('')
        );

        world.back();
        world.back();
        world.back();
        world.back();

        result = world.generate();
        assert.equal(result.join(''),origin.join(''));
    });

    it('roll to right if left impossible', () => {
        let world = new World(
               ["#########",
                "#*  O   #",
                "#  :    #",
                "#   +   #",
                "#       #",
                "#       #",
                "#########"]
        );
        world.update(Up);
        world.update(Up);
        world.update(Up);
        world.update(Up);

        let result = world.generate(Up);
        assert.equal(result.join(''),
               ["#########",
                "#       #",
                "#  :    #",
                "#   +   #",
                "#    O  #",
                "#*      #",
                "#########"].join('')
        );

        world.back();
        world.back();
        world.back();
        world.back();

        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
    });

    it('affected top falling things', () => {
        let world = new World(
               ["###########",
                "#*  OOOO  #",
                "#   OOOO  #",
                "#         #",
                "#         #",
                "#         #",
                "###########"]
        );
        world.update(Up);
        world.update(Up);
        world.update(Up);
        world.update(Up);

        let result = world.generate(Up);
        assert.equal(result.join(''),
               ["###########",
                "#         #",
                "#         #",
                "#         #",
                "#  O OO O #",
                "#*  OOOO  #",
                "###########"].join('')
        );

        world.back();
        world.back();
        world.back();
        world.back();

        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));

    });

    it('affected top right things', () => {
        let world = new World(
               ["###########",
                "#*  OOOO: #",
                "#      +  #",
                "#         #",
                "#         #",
                "#         #",
                "###########"]
        );
        world.update(Up);
        world.update(Up);
        world.update(Up);
        world.update(Up);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            ["###########",
                "#       : #",
                "#     O+  #",
                "#         #",
                "#         #",
                "#*  OOO   #",
                "###########"].join('')
        );

        world.back();
        world.back();
        world.back();
        world.back();

        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));

    });

    it('stone will immiditale move after affect if its right from player', () => {
        let world = new World(
               ["###########",
                "#     AO: #",
                "#      +  #",
                "#         #",
                "#         #",
                "#         #",
                "###########"]
        );
        world.update(Up);
        world.update(Left);
        world.update(Left);

        let result = world.generate();
        assert.equal(result.join(''),
               ["###########",
                "#   A   : #",
                "#     O+  #",
                "#         #",
                "#         #",
                "#         #",
                "###########"].join('')
        );

        world.back();
        world.back();
        world.back();

        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
    });

    it('stone will move on next turn after affect if its left from player', () => {
        let world = new World(
            [   "###########",
                "#   :OA   #",
                "#    +    #",
                "#         #",
                "#         #",
                "#         #",
                "###########"]
        );
        world.update(Right);
        world.update(Right);
        world.update(Right);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            ["###########",
                "#   :    A#",
                "#    +O   #",
                "#         #",
                "#         #",
                "#         #",
                "###########"].join('')
        );

        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
    });

    it('kill player after simple fall', () => {
        let world = new World(
            [   "###########",
                "#   :O    #",
                "#         #",
                "#   A     #",
                "#         #",
                "#         #",
                "###########"]
        );
        world.update(Right);
        world.update(Right);
        world.update(Right);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#   :     #",
                "#    O    #",
                "#    A    #",
                "#         #",
                "#         #",
                "###########"].join('')
        );
        assert.equal(world.alive, false);

        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
    });

    it('not falling stone cant kill 1', () => {
        let world = new World(
            [   "###########",
                "# *  O    #",
                "#    A    #",
                "#         #",
                "#         #",
                "#         #",
                "###########"]
        );
        world.update(Hold);
        world.update(Hold);
        world.update(Hold);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#    O    #",
                "#    A    #",
                "#         #",
                "# *       #",
                "#         #",
                "###########"].join('')
        );
        assert.equal(world.alive, true);

        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
    });

    it('player consume dimond and dimond not apiar on next turn', () => {
        let world = new World(
            [   "###########",
                "#   :*:   #",
                "#   :*:   #",
                "#    :A   #",
                "# ::::::: #",
                "#         #",
                "###########"]
        );
        world.update(Left);
        world.update(Up);
        world.update(Up);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#   :A:   #",
                "#   : :   #",
                "#         #",
                "# ::::::: #",
                "#         #",
                "###########"].join('')
        );
        assert.equal(world.alive, true);

        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
    });

    it('consume dimond affected by stone', () => {
        let world = new World(
            [   "###########",
                "#   :*:   #",
                "#   :*O   #",
                "#    :A   #",
                "# ::::::: #",
                "#         #",
                "###########"]
        );
        world.update(Left);
        world.update(Up);
        world.update(Up);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#   :A:   #",
                "#   :     #",
                "#     O   #",
                "# ::::::: #",
                "#         #",
                "###########"].join('')
        );
        assert.equal(world.alive, true);

        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
    });

    it('kill butterfly', () => {
        let world = new World(
            [   "###########",
                "#        A#",
                "#   O     #",
                "#         #",
                "#    /    #",
                "#         #",
                "###########"]
        );
        world.update(Right);
        world.update(Right);
        world.update(Right);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#        A#",
                "#         #",
                "#  XXX    #",
                "#  XXX    #",
                "#  XXX    #",
                "###########"].join('')
        );
        assert.equal(world.alive, true);

        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join('').replace('/','%'));
        assert.equal(world.alive, true);
    });

    it('kill butterfly locked by stone', () => {
        let world = new World(
            [   "###########",
                "#         #",
                "# AO      #",
                "#  :      #",
                "#  :/:    #",
                "#  :::    #",
                "###########"]
        );
        world.update(Right);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#         #",
                "#  A      #",
                "#  XXX    #",
                "#  XXX    #",
                "#  XXX    #",
                "###########"].join('')
        );
        assert.equal(world.alive, true);

        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join('').replace('/','%'));
        assert.equal(world.alive, true);
    });

    it('fall left only on next turn', () => {
        let world = new World(
            [   "###########",
                "#         #",
                "#     OA  #",
                "#     :   #",
                "#         #",
                "#         #",
                "###########"]
        );
        world.update(Left);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#         #",
                "#    OA   #",
                "#     :   #",
                "#         #",
                "#         #",
                "###########"].join('')
        );
        assert.equal(world.alive, true);

        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
        assert.equal(world.alive, true);
    });

    it('rolled stone kill player on move up', () => {
        let world = new World(
            [   "###########",
                "#      O  #",
                "#      O  #",
                "#     A:  #",
                "#         #",
                "#         #",
                "###########"]
        );
        world.update(Up);
        world.update(Left);
        world.update(Left);
        world.update(Left);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#     O   #",
                "#     AO  #",
                "#      :  #",
                "#         #",
                "#         #",
                "###########"].join('')
        );
        assert.equal(world.alive, false);

        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
        assert.equal(world.alive, true);
        assert.equal(world.frame, 0);
    });

    it('falling explosion', () => {
        let world = new World(
            [   "###########",
                "#A        #",
                "#:   ***  #",
                "#:   ***  #",
                "#:   ***  #",
                "#         #",
                "###########"]
        );

        let path = 'lll';
        for(let i =0; i < path.length; i++){
            world.update(dirmap[path[i]]);
            world.back();
            world.update(dirmap[path[i]]);
        }

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#A        #",
                "#:        #",
                "#:  **  * #",
                "#:    *   #",
                "#   ***** #",
                "###########"].join('')
        );
        result = world.generate();
        //assert.equal(result.join(''), world.origin.join(''));
    });

    it('consume explosion 2', () =>  {
        let world = new World(
            [   "###########",
                "#         #",
                "#:        #",
                "#:    O   #",
                "#:   : :  #",
                "#    :/:  #",
                "# A  :::  #",
                "###########"]
        );
        world.update(Right);
        world.update(Right);
        world.update(Right);
        world.update(Right);
        world.update(Right);
        world.update(Right);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#         #",
                "#:        #",
                "#:        #",
                "#:  * * * #",
                "#    ** * #",
                "#    A**  #",
                "###########"].join('')
        );
        world.back();
        world.back();
        world.back();
        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join('').replace('%','/'), world.origin.join(''));
    });

    it('consume explosion with revert   ', () =>  {
        let world = new World(
            [   "##############",
                "#            #",
                "#:           #",
                "#:  : O      #",
                "#:  :***     #",
                "#   :***O*   #",
                "#   :*****A  #",
                "##############"]
        );

        let path = "llllu";
        for(let i =0; i < path.length; i++){
            world.update(dirmap[path[i]]);
            world.back();
            world.update(dirmap[path[i]]);
        }

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "##############",
                "#            #",
                "#:           #",
                "#:  : O      #",
                "#:  :** *    #",
                "#   :*A      #",
                "#   :* *O*   #",
                "##############"].join('')
        );
    });

    it('consume dimonds on going top with rolling', () =>  {
        let world = new World(
            [   "##############",
                "#            #",
                "#:           #",
                "#:  :        #",
                "#:  :  *:    #",
                "#   :+*+     #",
                "#   : :  A   #",
                "##############"]
        );

        let path = "llluuu";
        for(let i =0; i < path.length; i++){
            world.update(dirmap[path[i]]);
/*            world.back();
            world.update(dirmap[path[i]]);*/
        }

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "##############",
                "#            #",
                "#:           #",
                "#:  : A      #",
                "#:  : * :    #",
                "#   :+ +     #",
                "#   :        #",
                "##############"].join('')
        );
    });
});

describe('Player moving', () => {

    it('simple path', () => {
        let world = new World(
            [   "###########",
                "#*        #",
                "#:   :A+  #",
                "#:   : :  #",
                "#:     :  #",
                "#:::::::  #",
                "###########"]
        );
        world.update(Down);
        world.update(Down);
        world.update(Left);
        world.update(Left);
        world.update(Left);
        world.update(Up);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#*        #",
                "#:   : +  #",
                "#: A : :  #",
                "#:     :  #",
                "#:::::::  #",
                "###########",
            ].join('')
        );

        world.back();
        world.back();
        world.back();
        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
        assert.equal(world.alive, true);
    });

    it('cant consume brick', () => {
        let world = new World(
            [   "###########",
                "#*        #",
                "#:   :A+  #",
                "#:   : :  #",
                "#:   +::  #",
                "#:::::::  #",
                "###########"]
        );
        world.update(Down);
        world.update(Down);
        world.update(Left);
        world.update(Left);
        world.update(Left);
        world.update(Up);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#*        #",
                "#:   : +  #",
                "#:   :A:  #",
                "#:   + :  #",
                "#:::::::  #",
                "###########",
            ].join('')
        );

        world.back();
        world.back();
        world.back();
        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
        assert.equal(world.alive, true);
    });

    it('can consume dimond', () => {
        let world = new World(
            [   "###########",
                "#*        #",
                "#:   :A+  #",
                "#:   :*:  #",
                "#:   +*:  #",
                "#:::::::  #",
                "###########"]
        );
        world.update(Down);
        world.update(Down);
        world.update(Left);
        world.update(Left);
        world.update(Left);
        world.update(Up);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#*        #",
                "#:   : +  #",
                "#:   :A:  #",
                "#:   + :  #",
                "#:::::::  #",
                "###########",
            ].join('')
        );

        world.back();
        world.back();
        world.back();
        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
        assert.equal(world.alive, true);
    });

    it('can move stone left', () => {
        let world = new World(
            [   "###########",
                "#*        #",
                "#:   OA+  #",
                "#: :::*:  #",
                "#:   +*:  #",
                "#:::::::  #",
                "###########"]
        );
        world.update(Left);
        world.update(Left);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#*        #",
                "#: OA  +  #",
                "#: :::*:  #",
                "#:   +*:  #",
                "#:::::::  #",
                "###########",
            ].join('')
        );

        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
        assert.equal(world.alive, true);
    });

    it('can move stone right', () => {
        let world = new World(
            [   "###########",
                "#*        #",
                "#: AO     #",
                "#: :::*:  #",
                "#:   +*:  #",
                "#:::::::  #",
                "###########"]
        );
        world.update(Right);
        world.update(Right);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#*        #",
                "#:   AO   #",
                "#: :::*:  #",
                "#:   +*:  #",
                "#:::::::  #",
                "###########",
            ].join('')
        );

        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
        assert.equal(world.alive, true);
    });

    it('can move stone right across sand', () => {
        let world = new World(
            [   "###########",
                "#*        #",
                "#: AO :   #",
                "#: :::*:  #",
                "#:   +*:  #",
                "#:::::::  #",
                "###########"]
        );
        world.update(Right);
        world.update(Right);
        world.update(Right);
        world.update(Right);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#*        #",
                "#:  AO:   #",
                "#: :::*:  #",
                "#:   +*:  #",
                "#:::::::  #",
                "###########",
            ].join('')
        );

        world.back();
        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
        assert.equal(world.alive, true);
    });

    it('cant move stone up', () => {
        let world = new World(
            [   "###########",
                "#*        #",
                "#:  O :   #",
                "#: :A:*:  #",
                "#:   +*:  #",
                "#:::::::  #",
                "###########"]
        );
        world.update(Up);
        world.update(Up);
        world.update(Up);
        world.update(Up);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#*        #",
                "#:  O :   #",
                "#: :A:*:  #",
                "#:   +*:  #",
                "#:::::::  #",
                "###########",
            ].join('')
        );

        world.back();
        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
        assert.equal(world.alive, true);
    });

    it('moved stone to right should be checking again', () => {
        let world = new World(
            [   "###########",
                "#* AO     #",
                "#:  : :   #",
                "#         #",
                "#         #",
                "#         #",
                "###########"]
        );
        world.update(Right);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#*  A     #",
                "#:  :O:   #",
                "#         #",
                "#         #",
                "#         #",
                "###########",
            ].join('')
        );

        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
        assert.equal(world.alive, true);
    });


    it('cant move falling stone', () => {
        let world = new World(
            [   "###########",
                "#     O   #",
                "#         #",
                "#     O   #",
                "#   A     #",
                "#         #",
                "#         #",
                "###########"]
        );
        world.update(Right);
        world.update(Right);
        world.update(Right);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#         #",
                "#         #",
                "#         #",
                "#    AO   #",
                "#         #",
                "#     O   #",
                "###########",
            ].join('')
        );

        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
        assert.equal(world.alive, true);
    });


    it('stones affecting', () => {
        let world = new World(
            [   "###########",
                "#         #",
                "#         #",
                "#    OO   #",
                "# :O:::A  #",
                "#  :::::  #",
                "#         #",
                "###########"]
        );
        world.update(Left);
        world.update(Left);
        world.update(Left);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#         #",
                "#         #",
                "#    O    #",
                "# :OA O   #",
                "#  :::::  #",
                "#         #",
                "###########",
            ].join('')
        );

        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
        assert.equal(world.alive, true);
    });

    it('can consume diamond which falled', () => {
        let world = new World(
            [   "###########",
                "#         #",
                "#  :*:    #",
                "#  : O    #",
                "# :O*:   A#",
                "#  :::::  #",
                "#         #",
                "###########"]
        );
        world.update(Left);
        world.update(Left);
        world.update(Left);
        world.update(Left);
        world.update(Left);
        world.update(Up);
        world.update(Up);

        assert.deepEqual()
        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#         #",
                "#  :A:    #",
                "#  :      #",
                "# :O O    #",
                "#  :::::  #",
                "#         #",
                "###########",
            ].join('')
        );

        world.back();
        world.back();
        world.back();
        world.back();
        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
        assert.equal(world.alive, true);
    });

    it('drop stone to left', () => {
        let world = new World(
               ["###########",
                "#    OA   #",
                "#   :::   #",
                "#         #",
                "#         #",
                "#         #",
                "#         #",
                "###########"]
        );

        let path = 'lll';
        for(let i =0; i < path.length; i++){
            world.update(dirmap[path[i]]);
            world.back();
            world.update(dirmap[path[i]]);
        }

        assert.deepEqual()
        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#  A      #",
                "#  O:::   #",
                "#         #",
                "#         #",
                "#         #",
                "#         #",
                "###########",
            ].join('')
        );

        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
        assert.equal(world.alive, true);
    });

    it('falling afected piramide', () => {
        let world = new World(
               ["###########",
                "# :O      #",
                "# :OO     #",
                "# :::A    #",
                "# :       #",
                "# :       #",
                "#         #",
                "###########"]
        );
        let path = 'llddl';
        for(let i =0; i < path.length; i++){
            world.update(dirmap[path[i]]);
            world.back();
            world.update(dirmap[path[i]]);
        }

        assert.deepEqual()
        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "# :       #",
                "# : O     #",
                "# :       #",
                "# :O      #",
                "# A O     #",
                "#         #",
                "###########",
            ].join('')
        );

        world.back();
        world.back();
        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
        assert.equal(world.alive, true);
    });

    it('consume just failed dimond', () => {
        let world = new World(
               ["###########",
                "# :O   *  #",
                "# :OO A   #",
                "# ::::::: #",
                "# :       #",
                "# :       #",
                "#         #",
                "###########"]
        );
        let path = 'r';
        for(let i =0; i < path.length; i++){
            world.update(dirmap[path[i]]);
            world.back();
            world.update(dirmap[path[i]]);
        }

        assert.deepEqual()
        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "# :O      #",
                "# :OO  A  #",
                "# ::::::: #",
                "# :       #",
                "# :       #",
                "#         #",
                "###########",
            ].join('')
        );

        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join(''));
        assert.equal(world.alive, true);
    });
});

describe('butterfly', () => {
    it('explotion if lock', () => {
        let world = new World(
            [   "###########",
                "#*     :  #",
                "#:    :/: #",
                "#:     :  #",
                "#:        #",
                "#A        #",
                "###########"]
        );
        world.update(Down);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#*    XXX #",
                "#:    XXX #",
                "#:    XXX #",
                "#:        #",
                "#A        #",
                "###########"
            ].join(''));
        assert.equal(world.alive, true);
    });

    it('moving 1', () => {
        let world = new World(
            [   "###########",
                "#*        #",
                "#:    :/: #",
                "#:     :  #",
                "#:        #",
                "#A        #",
                "###########"]
        );
        world.update(Down);
        world.update(Down);
        world.update(Down);
        world.update(Down);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#*        #",
                "#:   %: : #",
                "#:     :  #",
                "#:        #",
                "#A        #",
                "###########"
            ].join(''));
        assert.equal(world.alive, true);
    });

    it('moving 2', () => {
        let world = new World(
            [   "###########",
                "#*        #",
                "#:    :/: #",
                "#:     :  #",
                "#:        #",
                "#A        #",
                "###########"]
        );
        world.update(Down);
        world.update(Down);
        world.update(Down);
        world.update(Down);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#*        #",
                "#:   %: : #",
                "#:     :  #",
                "#:        #",
                "#A        #",
                "###########"
            ].join(''));
        assert.equal(world.alive, true);
    });

    it('butterfly kill player', () => {
        let world = new World(
            [   "###########",
                "#*        #",
                "#:    :/: #",
                "#:   A+:  #",
                "#:        #",
                "#         #",
                "###########"]
        );
        world.update(Right);
        world.update(Right);
        world.update(Right);
        world.update(Right);
        world.update(Right);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#*        #",
                "#:   %: : #",
                "#:   A+:  #",
                "#:        #",
                "#         #",
                "###########"
            ].join(''));
        assert.equal(world.alive, false);
    });

    it('explosion cant exploide steel', () => {
        let world = new World(
            [   "###########",
                "#* A      #",
                "#:        #",
                "#:        #",
                "#:       :#",
                "#       :/#",
                "###########"]
        );
        world.update(Left);
        world.update(Left);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#A        #",
                "#:        #",
                "#:        #",
                "#:      XX#",
                "#       XX#",
                "###########"
            ].join(''));
        assert.equal(world.alive, true);
    });

    it('explosion kill player', () => {
        let world = new World(
            [   "###########",
                "#*        #",
                "#:        #",
                "#:        #",
                "#:      A:#",
                "#       +/#",
                "###########"]
        );
        world.update(Down);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#*        #",
                "#:        #",
                "#:        #",
                "#:      A:#",
                "#       +%#",
                "###########"
            ].join(''));
        assert.equal(world.alive, false);
    });

    it('consume explosion result', () => {
        let world = new World(
            [   "###########",
                "#*        #",
                "#:        #",
                "#:        #",
                "#:       :#",
                "#  A    +/#",
                "###########"]
        );
        world.update(Right);
        world.update(Right);
        world.update(Right);
        world.update(Right);
        world.update(Right);
        world.update(Right);
        world.update(Right);
        world.update(Right);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#*        #",
                "#:        #",
                "#:        #",
                "#:       *#",
                "#       *A#",
                "###########"
            ].join(''));
        assert.equal(world.alive, true);

        world.back();
        world.back();
        world.back();
        world.back();
        world.back();
        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join('').replace('/','%'));
        assert.equal(world.alive, true);
    });

    it('move butterfly from left top corner', () => {
        let world = new World(
            [   "###########",
                "#/        #",
                "#:        #",
                "#:        #",
                "#:        #",
                "#        A#",
                "###########"]
        );
        world.update(Right);
        world.update(Right);
        world.update(Right);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#  %      #",
                "#:        #",
                "#:        #",
                "#:        #",
                "#        A#",
                "###########"
            ].join(''));
        assert.equal(world.alive, true);

        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join('').replace('/','%'));
        assert.equal(world.alive, true);
    });

    it('butterfly remove stone and dimond after explosion', () => {
        let world = new World(
            [   "###########",
                "#         #",
                "#:        #",
                "#:     AO #",
                "#:      : #",
                "#       */#",
                "###########"]
        );
        world.update(Right);
        world.update(Right);
        world.update(Right);

        let result = world.generate(Up);
        assert.equal(result.join(''),
            [   "###########",
                "#         #",
                "#:        #",
                "#:       A#",
                "#:      XX#",
                "#       XX#",
                "###########"
            ].join(''));
        assert.equal(world.alive, true);

        world.back();
        world.back();
        world.back();
        result = world.generate();
        assert.equal(result.join(''), world.origin.join('').replace('/','%'));
        assert.equal(world.alive, true);
    });
});

describe('revert', () => {

});

