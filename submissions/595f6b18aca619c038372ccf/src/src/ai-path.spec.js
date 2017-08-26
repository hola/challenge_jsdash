describe('getNearestDiamond', function () {
    it('correctly gets nearest diamond #1', function () {
        var input = [
            "    *", 
            "     ", 
            " *   ", 
            "   A ", 
            "     " 
        ];
        var result = getNearestDiamond(input);

        expect(result).toEqual({x:1, y:2});
    });

    it('correctly gets nearest diamond #2', function () {
        var input = [
            "     ", 
            " *   ", 
            " A * ", 
            "     ", 
            "     " 
        ];
        var result = getNearestDiamond(input);

        expect(result).toEqual({x:1, y:1});
    });

    it('returns undefined if no diamonds found', function () {
        var input = [
            "     ", 
            "     ", 
            "     ", 
            "   A ", 
            "     " 
        ];
        var result = getNearestDiamond(input);

        expect(result).not.toBeDefined();
    });
});

describe('findPlayer', function () {
    it('correctly finds player', function () {
        var screen = [
            "    *", 
            "     ", 
            " *   ", 
            "    A", 
            "     " 
        ];
        var result = findPlayer(screen);

        expect(result).toEqual({x:4, y:3});
    });
});

describe('findDiamonds', function () {
    it('correctly finds diamonds', function () {
        var screen = [
            "    *", 
            "     ", 
            " *   ", 
            "    A", 
            "     " 
        ];
        var result = findDiamonds(screen);

        expect(result).toEqual([{x: 4, y: 0}, {x: 1, y: 2}]);
    });

    it('returns empty array if no diamonds found', function () {
        var screen = [
            "     ", 
            "     ", 
            "     ", 
            "    A", 
            "     " 
        ];
        var result = findDiamonds(screen);

        expect(result).toEqual([]);
    });
});

describe('screenToGraph', function () {
    it('correctly converts screen to graph', function () {
        let screen = [
            "  # *", 
            "    #", 
            " :*:#", 
            " :::A", 
            "#####" 
        ];
        let result = screenToGraph(screen);

        expect(result).toEqual([
            [0,0,1,0,0],
            [0,0,0,0,1],
            [0,0,0,0,1],
            [0,0,0,0,0],
            [1,1,1,1,1]
        ]);
    });

});

describe('wrapButterflies', function () {

    it('should add obstacles around turned butterfly', function () {
        let screen = [
            "  * * ", 
            " *** *", 
            " *-  *", 
            " *  * ", 
            "* **  " 
        ];
        let result = wrapButterflies(screen);

        expect(result).toEqual([
            "  * # ", 
            " *## #", 
            " #   #", 
            " #  # ", 
            "* ##  "         
        ]);

        // expect(result).toEqual([
        //     "  * # ", 
        //     " *## #", 
        //     " #####", 
        //     " ## # ", 
        //     "* ##  "         
        // ]);
    });

});