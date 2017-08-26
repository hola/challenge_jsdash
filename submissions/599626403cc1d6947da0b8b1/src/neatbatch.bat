@ECHO OFF
FOR /L %%I IN (1,1,200) DO (
	node neat.js -s

	FOR /L %%J IN (0,1,19) DO (
		ECHO %%J
        ECHO %%I
		@ECHO var popindex = %%J;>> neatai.js
		node jsdash.js --force --ai=neatai.js --in-process --log=out.json --max-speed
		node neat.js -u
	)

	node neat.js -e
)