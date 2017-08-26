'use strict';
const TIME_TO_WAIT = 60;
const START_STEP = 750; 
const E = module.exports = {};
const IS_LOOSING = 32 | 8 | 64 | 16,
IS_FALLING = 64 | 16,
IS_ROUND = 1 | 32 | 8,
IS_BUTTERFLY = 256 | 1024 | 2048 | 512,
IS_WALK_INTO = 4 | 2 | 32 | 64,
NEED_UPDATE = IS_BUTTERFLY | 128 | 4096 | 8192 | 16384 | 32768;
const serie_calc = new Array(256);
for (var serie_calc_i = 255; serie_calc_i--; ) {
	let add_score = true;
	for (let i = 2; i * i <= serie_calc_i; i++) {
		if (serie_calc_i % i == 0) {
			add_score = false;
			break;
		}
	}
	serie_calc[serie_calc_i] = (add_score ? serie_calc_i : 0) | 0;
}
serie_calc[1] = 0;
serie_calc[2] = 0;
const char_to_thing = {
	'+': 1,
	':': 2,
	' ': 4,
	'O': 8,
	'*': 32,
	'/': 256,
	'\\': 256,
	'-': 256,
	'|': 256,
	'A': 128,
};
const apply_dir = [];
apply_dir[0] = -38;
apply_dir[3] = -1;
apply_dir[1] = 1;
apply_dir[2] = 38;
apply_dir[4] = 0;
const dirt_near_bfly_a = new Array(24);
dirt_near_bfly_a[0] = 0;
dirt_near_bfly_a[1] = 0;
dirt_near_bfly_a[2] = 0;
dirt_near_bfly_a[3] = 0;
dirt_near_bfly_a[4] = 0;
dirt_near_bfly_a[5] = 0;
dirt_near_bfly_a[6] = 0;
dirt_near_bfly_a[7] = 0;
dirt_near_bfly_a[8] = 0;
dirt_near_bfly_a[9] = 0;
dirt_near_bfly_a[10] = 0;
dirt_near_bfly_a[11] = 0;
dirt_near_bfly_a[12] = 0;
dirt_near_bfly_a[13] = 0;
dirt_near_bfly_a[14] = 0;
dirt_near_bfly_a[15] = 0;
dirt_near_bfly_a[16] = 0;
dirt_near_bfly_a[17] = 0;
dirt_near_bfly_a[18] = 0;
dirt_near_bfly_a[19] = 0;
dirt_near_bfly_a[20] = 0;
dirt_near_bfly_a[21] = 0;
dirt_near_bfly_a[22] = 0;
dirt_near_bfly_a[23] = 0;
const processed_a = new Array(24);

function Emulator(screen) {
	this.add_frame = Emulator.prototype.add_frame;
	this.revert_step = Emulator.prototype.revert_step;
	this.revert_changes = Emulator.prototype.revert_changes;
	if (screen instanceof Emulator) {
		this.streak = screen.streak;
		this.jscore = screen.jscore;
		this.serie = screen.serie;
		this.score = screen.score;
		this.player_pos = screen.player_pos;
		var i,
		j,
		changes,
		new_changes;
		var len = screen.streaks.length;
		this.changes = new Array(len);
		this.streaks = new Array(len);
		this.jscores = new Array(len);
		this.scores = new Array(len);
		this.series = new Array(len);
		for (i = len; i; ) {
			i = i - 1 | 0;
			this.streaks[i] = screen.streaks[i];
			this.jscores[i] = screen.jscores[i];
			this.series[i] = screen.series[i];
			this.scores[i] = screen.scores[i];
			changes = screen.changes[i];
			new_changes = new Array(changes.length);
			for (j = changes.length; j; ) {
				j = j - 1 | 0;
				new_changes[j] = changes[j];
			}
			this.changes[i] = new_changes;
		}
		var bm = screen.bad_map;
		this.bad_map = [
			bm[0], bm[1], bm[2], bm[3], bm[4], bm[5], bm[6], bm[7], bm[8], bm[9],
			bm[10], bm[11], bm[12], bm[13], bm[14], bm[15], bm[16], bm[17], bm[18], bm[19],
			bm[20], bm[21], bm[22], bm[23], bm[24], bm[25], bm[26], bm[27], bm[28], bm[29],
			bm[30], bm[31], bm[32], bm[33], bm[34], bm[35], bm[36], bm[37], bm[38], bm[39],
			bm[40], bm[41], bm[42], bm[43], bm[44], bm[45], bm[46], bm[47], bm[48], bm[49],
			bm[50], bm[51], bm[52], bm[53], bm[54], bm[55], bm[56], bm[57], bm[58], bm[59],
			bm[60], bm[61], bm[62], bm[63], bm[64], bm[65], bm[66], bm[67], bm[68], bm[69],
			bm[70], bm[71], bm[72], bm[73], bm[74], bm[75], bm[76], bm[77], bm[78], bm[79],
			bm[80], bm[81], bm[82], bm[83], bm[84], bm[85], bm[86], bm[87], bm[88], bm[89],
			bm[90], bm[91], bm[92], bm[93], bm[94]
		]
		var w = screen.world;
		this.world = [
			w[0], w[1], w[2], w[3], w[4], w[5], w[6], w[7], w[8], w[9], w[10], w[11], w[12], w[13], w[14], w[15], w[16], w[17], w[18], w[19], w[20], w[21], w[22], w[23], w[24], w[25], w[26], w[27], w[28], w[29], w[30], w[31], w[32], w[33], w[34], w[35], w[36], w[37], w[38], w[39], w[40], w[41], w[42], w[43], w[44], w[45], w[46], w[47], w[48], w[49], w[50], w[51], w[52], w[53], w[54], w[55], w[56], w[57], w[58], w[59], w[60], w[61], w[62], w[63], w[64], w[65], w[66], w[67], w[68], w[69], w[70], w[71], w[72], w[73], w[74], w[75], w[76], w[77], w[78], w[79], w[80], w[81], w[82], w[83], w[84], w[85], w[86], w[87], w[88], w[89], w[90], w[91], w[92], w[93], w[94], w[95], w[96], w[97], w[98], w[99],
			w[100], w[101], w[102], w[103], w[104], w[105], w[106], w[107], w[108], w[109], w[110], w[111], w[112], w[113], w[114], w[115], w[116], w[117], w[118], w[119], w[120], w[121], w[122], w[123], w[124], w[125], w[126], w[127], w[128], w[129], w[130], w[131], w[132], w[133], w[134], w[135], w[136], w[137], w[138], w[139], w[140], w[141], w[142], w[143], w[144], w[145], w[146], w[147], w[148], w[149], w[150], w[151], w[152], w[153], w[154], w[155], w[156], w[157], w[158], w[159], w[160], w[161], w[162], w[163], w[164], w[165], w[166], w[167], w[168], w[169], w[170], w[171], w[172], w[173], w[174], w[175], w[176], w[177], w[178], w[179], w[180], w[181], w[182], w[183], w[184], w[185], w[186], w[187], w[188], w[189], w[190], w[191], w[192], w[193], w[194], w[195], w[196], w[197], w[198], w[199],
			w[200], w[201], w[202], w[203], w[204], w[205], w[206], w[207], w[208], w[209], w[210], w[211], w[212], w[213], w[214], w[215], w[216], w[217], w[218], w[219], w[220], w[221], w[222], w[223], w[224], w[225], w[226], w[227], w[228], w[229], w[230], w[231], w[232], w[233], w[234], w[235], w[236], w[237], w[238], w[239], w[240], w[241], w[242], w[243], w[244], w[245], w[246], w[247], w[248], w[249], w[250], w[251], w[252], w[253], w[254], w[255], w[256], w[257], w[258], w[259], w[260], w[261], w[262], w[263], w[264], w[265], w[266], w[267], w[268], w[269], w[270], w[271], w[272], w[273], w[274], w[275], w[276], w[277], w[278], w[279], w[280], w[281], w[282], w[283], w[284], w[285], w[286], w[287], w[288], w[289], w[290], w[291], w[292], w[293], w[294], w[295], w[296], w[297], w[298], w[299],
			w[300], w[301], w[302], w[303], w[304], w[305], w[306], w[307], w[308], w[309], w[310], w[311], w[312], w[313], w[314], w[315], w[316], w[317], w[318], w[319], w[320], w[321], w[322], w[323], w[324], w[325], w[326], w[327], w[328], w[329], w[330], w[331], w[332], w[333], w[334], w[335], w[336], w[337], w[338], w[339], w[340], w[341], w[342], w[343], w[344], w[345], w[346], w[347], w[348], w[349], w[350], w[351], w[352], w[353], w[354], w[355], w[356], w[357], w[358], w[359], w[360], w[361], w[362], w[363], w[364], w[365], w[366], w[367], w[368], w[369], w[370], w[371], w[372], w[373], w[374], w[375], w[376], w[377], w[378], w[379], w[380], w[381], w[382], w[383], w[384], w[385], w[386], w[387], w[388], w[389], w[390], w[391], w[392], w[393], w[394], w[395], w[396], w[397], w[398], w[399],
			w[400], w[401], w[402], w[403], w[404], w[405], w[406], w[407], w[408], w[409], w[410], w[411], w[412], w[413], w[414], w[415], w[416], w[417], w[418], w[419], w[420], w[421], w[422], w[423], w[424], w[425], w[426], w[427], w[428], w[429], w[430], w[431], w[432], w[433], w[434], w[435], w[436], w[437], w[438], w[439], w[440], w[441], w[442], w[443], w[444], w[445], w[446], w[447], w[448], w[449], w[450], w[451], w[452], w[453], w[454], w[455], w[456], w[457], w[458], w[459], w[460], w[461], w[462], w[463], w[464], w[465], w[466], w[467], w[468], w[469], w[470], w[471], w[472], w[473], w[474], w[475], w[476], w[477], w[478], w[479], w[480], w[481], w[482], w[483], w[484], w[485], w[486], w[487], w[488], w[489], w[490], w[491], w[492], w[493], w[494], w[495], w[496], w[497], w[498], w[499],
			w[500], w[501], w[502], w[503], w[504], w[505], w[506], w[507], w[508], w[509], w[510], w[511], w[512], w[513], w[514], w[515], w[516], w[517], w[518], w[519], w[520], w[521], w[522], w[523], w[524], w[525], w[526], w[527], w[528], w[529], w[530], w[531], w[532], w[533], w[534], w[535], w[536], w[537], w[538], w[539], w[540], w[541], w[542], w[543], w[544], w[545], w[546], w[547], w[548], w[549], w[550], w[551], w[552], w[553], w[554], w[555], w[556], w[557], w[558], w[559], w[560], w[561], w[562], w[563], w[564], w[565], w[566], w[567], w[568], w[569], w[570], w[571], w[572], w[573], w[574], w[575], w[576], w[577], w[578], w[579], w[580], w[581], w[582], w[583], w[584], w[585], w[586], w[587], w[588], w[589], w[590], w[591], w[592], w[593], w[594], w[595], w[596], w[597], w[598], w[599],
			w[600], w[601], w[602], w[603], w[604], w[605], w[606], w[607], w[608], w[609], w[610], w[611], w[612], w[613], w[614], w[615], w[616], w[617], w[618], w[619], w[620], w[621], w[622], w[623], w[624], w[625], w[626], w[627], w[628], w[629], w[630], w[631], w[632], w[633], w[634], w[635], w[636], w[637], w[638], w[639], w[640], w[641], w[642], w[643], w[644], w[645], w[646], w[647], w[648], w[649], w[650], w[651], w[652], w[653], w[654], w[655], w[656], w[657], w[658], w[659], w[660], w[661], w[662], w[663], w[664], w[665], w[666], w[667], w[668], w[669], w[670], w[671], w[672], w[673], w[674], w[675], w[676], w[677], w[678], w[679], w[680], w[681], w[682], w[683], w[684], w[685], w[686], w[687], w[688], w[689], w[690], w[691], w[692], w[693], w[694], w[695], w[696], w[697], w[698], w[699],
			w[700], w[701], w[702], w[703], w[704], w[705], w[706], w[707], w[708], w[709], w[710], w[711], w[712], w[713], w[714], w[715], w[716], w[717], w[718], w[719], w[720], w[721], w[722], w[723], w[724], w[725], w[726], w[727], w[728], w[729], w[730], w[731], w[732], w[733], w[734], w[735], w[736], w[737], w[738], w[739], w[740], w[741], w[742], w[743], w[744], w[745], w[746], w[747], w[748], w[749], w[750], w[751], w[752], w[753], w[754], w[755], w[756], w[757], w[758], w[759]
		];
		return;
	}
	var bad_map = this.bad_map = new Array(95);
	this.serie = 0;
	this.series = [0];
	this.jscore = 0;
	this.jscores = [0];

	this.streaks = [0];
	this.streak_ended = false;
	this.streak = 0;
	this.score = 0;
	this.scores = [0];
	var changes = [];
	for (var bad_map_i = 0; bad_map_i < 95; bad_map_i++)
		bad_map[bad_map_i] = 0;
	this.world = new Array(760);
	var x,
	y,
	w;
	for (y = 1, w = 0; y < 21; y++) {
		let line = screen[y];
		for (x = 1; x < 39; x++, w++)
			this.world[w] = char_to_thing[line[x]];
	}
	var QW;
	for (x = 0; x < 38; x++) {
		bad_map[x >> 5] |= 1 << (x & 31);
		QW = (722 + x) + 760 * 2;
		bad_map[QW >> 5] |= 1 << (QW & 31);
	}
	for (y = 0; y < 20; y++) {
		QW = 37 + y * 38 + 760;
		bad_map[QW >> 5] |= 1 << (QW & 31);
		QW = 0 + y * 38 + 760 * 3;
		bad_map[QW >> 5] |= 1 << (QW & 31);
	}
	let already_visited = new Set();
	let bflies = [];
	for (let w = 0; w < 760; w++) {
		if (this.world[w] & IS_BUTTERFLY) {
			already_visited.add(w);
			bflies.push(w);
		} else if (this.world[w] === 1) {
			x = w % 38;
			if (x !== 0) {
				QW = w - 1 + 760;
				bad_map[QW >> 5] |= 1 << (QW & 31);
			}
			if (x !== 37) {
				QW = w + 1 + 760 * 3;
				bad_map[QW >> 5] |= 1 << (QW & 31);
			}
			if (w >= 38) {
				QW = w - 38 + 760 * 2;
				bad_map[QW >> 5] |= 1 << (QW & 31);
			}
			if (w < 722) {
				QW = w + 38;
				bad_map[QW >> 5] |= 1 << (QW & 31);
			}
		}
	}
	this.check_neighbors(bflies, already_visited);

	processed_a[0] = 0;
	processed_a[1] = 0;
	processed_a[2] = 0;
	processed_a[3] = 0;
	processed_a[4] = 0;
	processed_a[5] = 0;
	processed_a[6] = 0;
	processed_a[7] = 0;
	processed_a[8] = 0;
	processed_a[9] = 0;
	processed_a[10] = 0;
	processed_a[11] = 0;
	processed_a[12] = 0;
	processed_a[13] = 0;
	processed_a[14] = 0;
	processed_a[15] = 0;
	processed_a[16] = 0;
	processed_a[17] = 0;
	processed_a[18] = 0;
	processed_a[19] = 0;
	processed_a[20] = 0;
	processed_a[21] = 0;
	processed_a[22] = 0;
	processed_a[23] = 0;
	for (let w = 0; w < 760; w++) {
		if (processed_a[w >> 5] & 1 << (w & 31))
			continue;
		let thing = this.world[w];
		if ((thing & IS_LOOSING) !== 0) {
			if (w >= 722)
				continue;
			let under = this.world[w + 38];
			if (under === 4) {
				this.world[w + 38] = thing << 1;
				processed_a[(w + 38) >> 5] |= 1 << ((w + 38) & 31);
				this.world[w] = 4;
				changes.push(w + 268435456);
				continue;
			}
			if ((under & IS_ROUND) === 0)
				continue;
			let x = w % 38;
			if (x !== 0 && this.world[w - 1] === 4 && this.world[w + 37] === 4) {
				this.world[w] = 4;
				this.world[w - 1] = thing << 1;
				changes.push(w + 402653184);
				continue;
			}
			if (x !== 37 && this.world[w + 1] === 4 && this.world[w + 39] === 4) {
				this.world[w] = 4;
				processed_a[(w + 1) >> 5] |= 1 << ((w + 1) & 31);
				this.world[w + 1] = thing << 1;
				changes.push(w + 134217728);
			}
			continue;
		}
		if ((thing & IS_BUTTERFLY) !== 0) {
			let x = w % 38;
			if (x !== 0 && this.world[w - 1] === 4) {
				this.world[w] = 4;
				this.world[w - 1] = 2048;
				changes.push(w + 402653184);
				continue;
			}
			if (w >= 38 && this.world[w - 38] === 4) {
				this.world[w - 38] = thing;
				this.world[w] = 4;
				changes.push(w);
				continue;
			}
			this.world[w] = 512;
			changes.push(w + 536870912);
			continue;
		}
		if (thing === 128) {
			this.player_pos = w;
			changes.push(w + 536870912);
		}
	}
	this.changes = [changes];
};
Emulator.prototype.explode = function (w, changes) {
	var x = w % 38;
	var l = x !== 0;
	var r = x !== 37;
	var points = [];
	if (w >= 38) {
		if (l)
			points.push(w - 39);
		points.push(w - 38);
		if (r)
			points.push(w - 37);
	}
	if (l)
		points.push(w - 1);
	changes.push(w + (this.world[w] << 10) + 536870912);
	this.world[w] = 4096;
	processed_a[w >> 5] |= 1 << (w & 31);
	if (r)
		points.push(w + 1);
	if (w < 722) {
		if (l)
			points.push(w + 37);
		points.push(w + 38);
		if (r)
			points.push(w + 39);
	} else {
		this.revert_changes(changes);
		return true;
	}
	var plen = points.length;
	var i = 0,
	p = 0,
	thing = 0,
	QW = 0;
	for (i = 0; i < plen; i++) {
		p = points[i];
		thing = this.world[p];
		if (thing < 4096) {
			if (thing & (128 | 32 | 64 | IS_BUTTERFLY)) {
				this.revert_changes(changes);
				return true;
			} else {
				changes.push(p + (thing << 10) + 536870912);
				this.world[p] = 4096;
				processed_a[p >> 5] |= 1 << (p & 31);
				if (thing === 1) {
					x = p % 38;
					if (x !== 0) {
						QW = p - 1 + 760;
						this.bad_map[QW >> 5] &= ~(1 << (QW & 31));
					}
					if (x !== 37) {
						QW = p + 1 + 760 * 3;
						this.bad_map[QW >> 5] &= ~(1 << (QW & 31));
					}
					if (w > 37) {
						QW = p - 38 + 760 * 2;
						this.bad_map[QW >> 5] &= ~(1 << (QW & 31));
					}
					if (w < 722) {
						QW = p + 38;
						this.bad_map[QW >> 5] &= ~(1 << (QW & 31));
					}
				}
			}
		}
	}
	return false;
}
Emulator.prototype.cut = function () {
	var len = this.streaks.length - START_STEP;
	var i = len,
	j;
	while (i) {
		i = i - 1 | 0;
		j = i + START_STEP | 0;
		this.streaks[i] = this.streaks[j];
		this.jscores[i] = this.jscores[j];
		this.series[i] = this.series[j];
		this.scores[i] = this.scores[j];
		this.changes[i] = this.changes[j];
	}
	this.streaks.length = len;
	this.jscores.length = len;
	this.series.length = len;
	this.scores.length = len;
	this.changes.length = len;
}

Emulator.prototype.check_neighbors = function (current, already_visited) {
	let next = [];
	for (let w of current) {
		if (w > 37) {
			let above = w - 38;
			if (!already_visited.has(above)) {
				already_visited.add(above);
				let thing = this.world[above];
				if (thing === 2)
					dirt_near_bfly_a[above >> 5] |= 1 << (above & 31);
				else if (thing === 4)
					next.push(above);
			}
		}
		if (w < 722) {
			let above = w + 38;
			if (!already_visited.has(above)) {
				already_visited.add(above);
				let thing = this.world[above];
				if (thing === 2)
					dirt_near_bfly_a[above >> 5] |= 1 << (above & 31);
				else if (thing === 4)
					next.push(above);
			}
		}
		if (w % 38 !== 0) {
			let above = w - 1;
			if (!already_visited.has(above)) {
				already_visited.add(above);
				let thing = this.world[above];
				if (thing === 2)
					dirt_near_bfly_a[above >> 5] |= 1 << (above & 31);
				else if (thing === 4)
					next.push(above);
			}
		}
		if (w % 38 !== 37) {
			let above = w + 1;
			if (!already_visited.has(above)) {
				already_visited.add(above);
				let thing = this.world[above];
				if (thing === 2)
					dirt_near_bfly_a[above >> 5] |= 1 << (above & 31);
				else if (thing === 4)
					next.push(above);
			}
		}
	}
	if (next.length)
		this.check_neighbors(next, already_visited);
}
Emulator.prototype.revert_step = function () {
	this.score = this.scores.pop();
	this.streak = this.streaks.pop();
	this.jscore = this.jscores.pop();
	this.serie = this.series.pop();
	this.streak_ended = false;
	this.revert_changes(this.changes.pop());
};
Emulator.prototype.revert_changes = function (changes) {
	var bad_map = this.bad_map;
	var world = this.world;
	var changes_len = changes.length - 1;
	var change = 0,
	coord_before = 0,
	dir = 0,
	opt = 0,
	coord_after = 0,
	thing = 0,
	x = 0,
	QW = 0;
	for (let i = changes_len; i >= 0; i--) {
		change = changes[i];
		coord_before = change & 1023;
		dir = change >> 27;
		opt = (change >> 10) & 65535;
		coord_after = coord_before + apply_dir[dir];

		thing = world[coord_after];
		if ((thing & IS_BUTTERFLY) !== 0) {
			world[coord_before] = 256 << opt;
			if (coord_after !== coord_before)
				world[coord_after] = 4;
		} else if ((thing & IS_LOOSING) !== 0) {
			if ((thing & IS_FALLING) !== 0) {
				world[coord_before] = opt === 1 ? thing : (thing >> 1);
				if (coord_before !== coord_after)
					world[coord_after] = 4;
			} else {
				if (opt === 1)
					world[coord_after] = thing << 1;
				else if (opt === 0)
					world[coord_after] = 4;
				else if (opt === 2)
					world[coord_after] = 32768;
			}
		} else if (thing > 4096)
			world[coord_after] = thing >> 1;
		else if (thing === 4096) {
			world[coord_after] = opt;
			if (opt === 1) {
				x = coord_after % 38;
				if (x !== 0) {
					QW = coord_after - 1 + 760;
					bad_map[QW >> 5] |= 1 << (QW & 31);
				}
				if (x !== 37) {
					QW = coord_after + 1 + 760 * 3;
					bad_map[QW >> 5] |= 1 << (QW & 31);
				}
				if (coord_after >= 38) {
					QW = coord_after - 38 + 760 * 2;
					bad_map[QW >> 5] |= 1 << (QW & 31);
				}
				if (coord_after < 722) {
					QW = coord_after + 38;
					bad_map[QW >> 5] |= 1 << (QW & 31);
				}
			}
		} else if (thing === 128 && coord_after !== coord_before) {
			world[coord_before] = 128;
			this.player_pos = coord_before;
			world[coord_after] = opt;
		}
	}
}
Emulator.prototype.add_frame = function (dir) {
	dir = dir | 0;
	let is_diamond_collected = false;
	let bflies_kiilled = 0;
	processed_a[0] = 0;
	processed_a[1] = 0;
	processed_a[2] = 0;
	processed_a[3] = 0;
	processed_a[4] = 0;
	processed_a[5] = 0;
	processed_a[6] = 0;
	processed_a[7] = 0;
	processed_a[8] = 0;
	processed_a[9] = 0;
	processed_a[10] = 0;
	processed_a[11] = 0;
	processed_a[12] = 0;
	processed_a[13] = 0;
	processed_a[14] = 0;
	processed_a[15] = 0;
	processed_a[16] = 0;
	processed_a[17] = 0;
	processed_a[18] = 0;
	processed_a[19] = 0;
	processed_a[20] = 0;
	processed_a[21] = 0;
	processed_a[22] = 0;
	processed_a[23] = 0;
	let new_changes = [];
	let check_for_changes = [];
	let last_changes = this.changes[this.changes.length - 1];
	let changes_len = last_changes.length;
	var i = 0,
	w = 0,
	to = 0,
	x = 0,
	next_to = 0,
	thing = 0,
	change = 0,
	coord_before = 0,
	coord_after = 0,
	under = 0,
	neighbours = 0,
	thing_to = 0;
	var l,
	r;
	var world = this.world;
	while (1) {
		change = last_changes[i];
		coord_before = change & 1023;
		coord_after = coord_before + apply_dir[change >> 27];
		thing = world[coord_after];
		if (thing === 128) {
			if (dir === 3 && (coord_after % 38) !== 37)
				check_for_changes.push(coord_after + 1);
			else if (dir === 0 && coord_after < 722) {
				x = coord_after % 38;
				if (x !== 37)
					check_for_changes.push(coord_after + 1);
				if (x !== 0)
					check_for_changes.push(coord_after - 1);
			} else if (dir === 1 && world[coord_after + 1] === 8)
				check_for_changes.push(coord_after + 2);
		}
		if (coord_before !== coord_after) {
			x = coord_before % 38;
			l = x !== 0;
			r = x !== 37;
			if (coord_before >= 38) {
				check_for_changes.push(coord_before - 38);
				if (l)
					check_for_changes.push(coord_before - 39);
				if (r)
					check_for_changes.push(coord_before - 37);
			}
			if (l)
				check_for_changes.push(coord_before - 1);
			if (r)
				check_for_changes.push(coord_before + 1);

			check_for_changes.push(coord_after);
		} else if ((thing & IS_LOOSING) !== 0) {
			if (coord_before >= 38)
				check_for_changes.push(coord_before - 38);
			check_for_changes.push(coord_after);
		} else if ((thing & NEED_UPDATE) !== 0)
			check_for_changes.push(coord_after);
		i = i + 1 | 0;
		if (!((i | 0) < (changes_len | 0)))
			break;
	}
	let score = 0;
	check_for_changes = check_for_changes.sort((a, b) => a - b);
	let checks_len = check_for_changes.length | 0;
	i = 0;
	while (1) {
		w = check_for_changes[i] | 0;
		if (!(processed_a[w >> 5] & 1 << (w & 31))) {
			processed_a[w >> 5] |= 1 << (w & 31);
			thing = world[w];
			if ((thing & IS_FALLING) !== 0) {
				if (w >= 722) {
					new_changes.push(w + 536871936);
					world[w] = thing >> 1;
				} else {
					coord_after = w + 38;
					under = world[coord_after];
					if (under === 4) {
						world[w] = 4;
						world[coord_after] = thing;
						processed_a[coord_after >> 5] |= 1 << (coord_after & 31);
						new_changes.push(w + 268436480);
					} else if ((under & IS_ROUND) !== 0) {
						x = w % 38;
						if (x !== 0 && world[w - 1] === 4 && world[w + 37] === 4) {
							world[w] = 4;
							world[w - 1] = thing;
							new_changes.push(w + 402654208);
						} else if (x !== 37 && world[w + 1] === 4 && world[w + 39] === 4) {
							world[w] = 4;
							coord_after = w + 1;
							world[coord_after] = thing;
							processed_a[coord_after >> 5] |= 1 << (coord_after & 31);
							new_changes.push(w + 134218752);
						} else {
							new_changes.push(w + 536871936);
							world[w] = thing >> 1;
						}
					} else if (under === 128) {
						this.revert_changes(new_changes);
						return true;
					} else if ((under & IS_BUTTERFLY) !== 0) {
						if (this.explode(w + 38, new_changes))
							return true;
						score += 200;
						bflies_kiilled++;
					} else {
						new_changes.push(w + 536871936);
						world[w] = thing >> 1;
					}
				}
			} else if ((thing & IS_LOOSING) !== 0) {
				if (w < 722) {
					coord_after = w + 38;
					under = world[coord_after];
					if (under === 4) {
						world[w] = 4;
						world[coord_after] = thing << 1;
						processed_a[coord_after >> 5] |= 1 << (coord_after & 31);
						score++;
						new_changes.push(w + 268435456);
					} else if ((under & IS_ROUND) !== 0) {
						x = w % 38;
						if (x !== 0 && world[w - 1] === 4 && world[w + 37] === 4) {
							world[w] = 4;
							world[w - 1] = thing << 1;
							score++;
							new_changes.push(w + 402653184);
						} else if (x !== 37 && world[w + 1] === 4 && world[w + 39] === 4) {
							world[w] = 4;
							world[w + 1] = thing << 1;
							processed_a[(w + 1) >> 5] |= 1 << ((w + 1) & 31);
							score++;
							new_changes.push(w + 134217728);
						}
					}
				}
			} else if ((thing & IS_BUTTERFLY) !== 0) {
				neighbours = 0;
				x = w % 38;
				if (x !== 0)
					neighbours = neighbours | world[w - 1];
				if (x !== 37)
					neighbours = neighbours | world[w + 1];
				if (w >= 38)
					neighbours = neighbours | world[w - 38];
				if (w < 722)
					neighbours = neighbours | world[w + 38];
				if ((neighbours & 128) !== 0) {
					this.revert_changes(new_changes);
					return true;
				} else if ((neighbours & 4) === 0) {
					if (this.explode(w, new_changes))
						return true;
					bflies_kiilled++;
					score += 200;
				} else if (thing === 256) {
					if (x !== 0 && world[w - 1] === 4) {
						world[w] = 4;
						world[w - 1] = 2048;
						new_changes.push(w + 402653184);
					} else if (w >= 38 && world[w - 38] === 4) {
						world[w] = 4;
						world[w - 38] = thing;
						new_changes.push(w);
					} else {
						world[w] = 512;
						new_changes.push(w + 536870912);
					}
				} else if (thing === 2048) {
					coord_after = w + 38;
					if (w < 722 && world[coord_after] === 4) {
						world[w] = 4;
						world[coord_after] = 1024;
						processed_a[coord_after >> 5] |= 1 << (coord_after & 31);
						new_changes.push(w + (3 << 10) + 268435456);
					} else if (x !== 0 && world[w - 1] === 4) {
						world[w] = 4;
						world[w - 1] = thing;
						new_changes.push(w + (3 << 10) + 402653184);
					} else {
						world[w] = 256;
						new_changes.push(w + (3 << 10) + 536870912);
					}
				} else if (thing === 1024) {
					coord_after = w + 1;
					if (x !== 37 && world[coord_after] === 4) {
						world[w] = 4;
						world[coord_after] = 512;
						processed_a[coord_after >> 5] |= 1 << (coord_after & 31);
						new_changes.push(w + (2 << 10) + 134217728);
					} else if (w < 760 - 38 && world[coord_after = w + 38] === 4) {
						world[w] = 4;
						world[coord_after] = thing;
						processed_a[coord_after >> 5] |= 1 << (coord_after & 31);
						new_changes.push(w + (2 << 10) + 268435456);
					} else {
						world[w] = 2048;
						new_changes.push(w + (2 << 10) + 536870912);
					}
				} else if (thing === 512) {
					coord_after = w - 38;
					if (w >= 38 && world[coord_after] === 4) {
						world[w] = 4;
						world[coord_after] = 256;
						new_changes.push(w + (1 << 10) + 0);
					} else if (x !== 37 && world[coord_after = w + 1] === 4) {
						world[w] = 4;
						world[coord_after] = thing;
						processed_a[coord_after >> 5] |= 1 << (coord_after & 31);
						new_changes.push(w + (1 << 10) + 134217728);
					} else {
						world[w] = 1024;
						new_changes.push(w + (1 << 10) + 536870912);
					}
				}
			} else if (thing === 128) {
				if (dir === 0) {
					to = w - 38;
					thing_to = world[to];
					if ((thing_to & IS_WALK_INTO) !== 0) {
						world[w] = 4;
						if (thing_to === 32) {
							score += 20;
							is_diamond_collected = true;
						}
						if (thing_to === 2 && (dirt_near_bfly_a[to >> 5] & 1 << (to & 31)))
							score += 20;
						if (thing_to === 2 && score === 0)
							score++;
						new_changes.push(w + (thing_to << 10));
						this.player_pos = to;
						world[to] = 128;
					} else {
						this.revert_changes(new_changes);
						return true;
					}
				} else if (dir === 3) {
					x = w % 38;
					to = w - 1;
					thing_to = world[to];
					if ((thing_to & IS_WALK_INTO) !== 0) {
						world[w] = 4;
						if (thing_to === 32) {
							is_diamond_collected = true;
							score += 20;
						}
						if (thing_to === 2 && (dirt_near_bfly_a[to >> 5] & 1 << (to & 31)))
							score += 20;
						if (thing_to === 2 && score === 0)
							score++;
						new_changes.push(w + 402653184 + (thing_to << 10));
						this.player_pos = to;
						world[to] = 128;
					} else if (thing_to === 8 && x !== 1) {
						next_to = to + (dir === 1 ? 1 : -1);
						if (world[next_to] === 4) {
							score++;
							world[w] = 4;
							world[next_to] = 8;
							new_changes.push(next_to + 536870912);
							new_changes.push(w + 402661376);
							this.player_pos = to;
							world[to] = 128;
						} else {
							this.revert_changes(new_changes);
							return true;
						}
					} else {
						this.revert_changes(new_changes);
						return true;
					}
				} else if (dir === 2) {
					to = w + 38;
					thing_to = world[to];
					if ((thing_to & IS_WALK_INTO) !== 0) {
						processed_a[to >> 5] |= 1 << (to & 31);
						world[w] = 4;
						if (thing_to === 32) {
							is_diamond_collected = true;
							score += 20;
						}
						if (thing_to === 2 && (dirt_near_bfly_a[to >> 5] & 1 << (to & 31)))
							score += 20;
						if (thing_to === 2 && score === 0)
							score++;
						new_changes.push(w + 268435456 + (thing_to << 10));
						this.player_pos = to;
						world[to] = 128;
					} else {
						this.revert_changes(new_changes);
						return true;
					}
				} else if (dir === 1) {
					x = w % 38;
					to = w + 1;
					thing_to = world[to];
					if ((thing_to & IS_WALK_INTO) !== 0) {
						processed_a[to >> 5] |= 1 << (to & 31);
						world[w] = 4;
						if (thing_to === 32) {
							is_diamond_collected = true;
							score += 20;
						}
						if (thing_to === 2 && (dirt_near_bfly_a[to >> 5] & 1 << (to & 31)))
							score += 20;
						if (thing_to === 2 && score === 0)
							score++;
						new_changes.push(w + 134217728 + (thing_to << 10));
						this.player_pos = to;
						world[to] = 128;
					} else if (thing_to === 8 && x !== 36) {
						next_to = to + 1;
						if (world[next_to] === 4) {
							processed_a[to >> 5] |= 1 << (to & 31);
							score++;
							world[w] = 4;
							world[next_to] = 8;
							new_changes.push(next_to + 536870912);
							new_changes.push(w + 134225920);
							this.player_pos = to;
							world[to] = 128;
						} else {
							this.revert_changes(new_changes);
							return true;
						}
					} else {
						this.revert_changes(new_changes);
						return true;
					}
				} else
					new_changes.push(w + 536870912);
			} else if (thing >= 4096) {
				if (thing < 32768) {
					new_changes.push(w + 536870912);
					world[w] = thing << 1;
				} else {
					new_changes.push(w + (2 << 10) + 536870912);
					world[w] = 32;
				}
			}
		}
		i = i + 1 | 0;
		if (!((i | 0) < (checks_len | 0)))
			break;
	}
	this.streaks.push(this.streak);
	this.series.push(this.serie);
	this.jscores.push(this.jscore);
	if (this.streak > 0) {
		this.streak--;
		if (this.streak === 0) {
			this.serie = 0;
			this.streak_ended = true;
		}
	}
	if (is_diamond_collected) {
		this.serie++;
		this.jscore++;
		this.streak = 20;
		this.jscore += serie_calc[this.serie];
	}
	this.jscore += bflies_kiilled * 10;
	this.changes.push(new_changes);
	this.scores.push(this.score);
	this.score += score;
	return false;
}

var ch_dirs = ['u', 'r', 'd', 'l', '#'];

function Path(e, end, len, prev, dec) {
	this.e = e;
	this.end = end;
	this.len = len;
	this.prev = prev;
	this.dec = dec;
	VISITED[this.v_i = end * e.player_pos] += 1;
};
Path.prototype.toString = function () {
	return `END:${this.end} LEN:${this.len} PREV:${this.prev} DEC:${this.dec} !!`;
}

var VISITED = new Array(760 * 1200);
for (var Q = 760 * 1200; Q--; )
	VISITED[Q] = 1;

function get_e(screen) {
	var e = new Emulator(screen);
	for (var i = START_STEP; i--; )
		e.add_frame(4);
	e.cut();
	return e;
}

function generate_first_path(e) {
	var set_of_empties_arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	var decisions = [],
	b_path;
	var qw = 0,
	dir1 = 0,
	steps1 = 0,
	pl_pos = 0,
	i = 0,
	s = 0,
	dec_len = 0,
	dir2 = 0,
	steps2 = 0,
	dir3 = 0,
	steps3 = 0,
	len = 0,
	scores_count = 0,
	prev_dir = 0,
	rel_score = 0.0,
	max_rel_score = 0.0,
	ggg = 0;
	main_loop: while (1) {
		max_rel_score = -1.0;
		scores_count = 0;
		e.score = 0;
		dec_len = decisions.length;
		prev_dir = 4;
		if (decisions[dec_len - 1] !== decisions[dec_len - 2] &&
			decisions[dec_len - 1] === decisions[dec_len - 3] &&
			decisions[dec_len - 1] === decisions[dec_len - 5] &&
			decisions[dec_len - 2] === decisions[dec_len - 4] &&
			decisions[dec_len - 2] === decisions[dec_len - 6]) {
			prev_dir = decisions[dec_len - 2];
		}
		set_of_empties_arr[0] = 0;
		set_of_empties_arr[1] = 0;
		set_of_empties_arr[2] = 0;
		set_of_empties_arr[3] = 0;
		set_of_empties_arr[4] = 0;
		set_of_empties_arr[5] = 0;
		set_of_empties_arr[6] = 0;
		set_of_empties_arr[7] = 0;
		set_of_empties_arr[8] = 0;
		set_of_empties_arr[9] = 0;
		set_of_empties_arr[10] = 0;
		set_of_empties_arr[11] = 0;
		set_of_empties_arr[12] = 0;
		set_of_empties_arr[13] = 0;
		set_of_empties_arr[14] = 0;
		set_of_empties_arr[15] = 0;
		set_of_empties_arr[16] = 0;
		set_of_empties_arr[17] = 0;
		set_of_empties_arr[18] = 0;
		set_of_empties_arr[19] = 0;
		set_of_empties_arr[20] = 0;
		set_of_empties_arr[21] = 0;
		set_of_empties_arr[22] = 0;
		set_of_empties_arr[23] = 0;
		for (dir1 = 0; dir1 < 4; dir1 = dir1 + 1 | 0) {
			if (prev_dir === dir1)
				continue;
			steps1 = 0;
			while (1) {
				if (e.streak_ended)
					break;
				qw = e.player_pos + dir1 * 760;
				if ((e.bad_map[qw >> 5] & 1 << (qw & 31)) || e.add_frame(dir1))
					break;
				steps1 = steps1 + 1 | 0;
				if (e.score === 0)
					set_of_empties_arr[e.player_pos >> 5] |= 1 << (e.player_pos & 31);
				for (dir2 = 0; dir2 < 4; dir2 = dir2 + 1 | 0) {
					if (dir2 === dir1)
						continue;
					pl_pos = e.player_pos + apply_dir[dir2];
					if (set_of_empties_arr[pl_pos >> 5] & 1 << (pl_pos & 31))
						continue;
					steps2 = 0;
					while (1) {
						if (e.streak_ended)
							break;
						qw = e.player_pos + dir2 * 760;
						if ((e.bad_map[qw >> 5] & 1 << (qw & 31)) || e.add_frame(dir2))
							break;
						steps2++
						if (e.score === 0) {
							if (set_of_empties_arr[e.player_pos >> 5] & 1 << (e.player_pos & 31))
								continue;
							set_of_empties_arr[e.player_pos >> 5] |= 1 << (e.player_pos & 31);
						}
						len = steps1 + steps2 | 0;
						for (dir3 = 0; dir3 < 4; dir3 = dir3 + 1 | 0) {
							if (dir3 === dir2)
								continue;
							steps3 = 0;
							while (1) {
								if (e.streak_ended)
									break;
								qw = e.player_pos + 760 * dir3;
								if ((e.bad_map[qw >> 5] & 1 << (qw & 31)) || e.add_frame(dir3))
									break;
								rel_score = e.score / (len + steps3);
								if (rel_score > max_rel_score) {
									if (!e.add_frame(4)) {
										e.revert_step();
										scores_count++;
										max_rel_score = rel_score;
										b_path = [steps1, dir1, steps2, dir2, steps3 + 1, dir3];
									}
								}
								steps3++;
							}
							while ((steps3--) !== 0)
								e.revert_step();
						}
					}
					while ((steps2--) !== 0)
						e.revert_step();
				}
			}
			while ((steps1--) !== 0)
				e.revert_step();
		}
		if (scores_count === 0) {
			decisions.push(4);
			if (e.add_frame(4)) {
				decisions.pop();
				break;
			} else {
				if (e.streak_ended)
					break;
			}
			continue;
		}
		ggg = b_path[0] + b_path[2] > 2 ? 1 : 3;
		for (s = 0; s < ggg; s++) {
			steps1 = b_path[s << 1];
			dir1 = b_path[(s << 1) + 1];
			for (i = 0; i < steps1; i++) {
				e.add_frame(dir1);
				decisions.push(dir1);
				if (e.streak_ended)
					break main_loop;
			}
		}
	}
	return decisions;
}

function build_tree(e, decisions, end_time, e2, dec2) {
	var set_of_empties_arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	var longest_path,
	e_alt,
	dec_alt,
	new_path,
	decisions_alt,
	b_path;
	var i = 0,
	r_len = 0,
	max = 0.0,
	dir1 = 0,
	dir2 = 0,
	steps1 = 0,
	steps2 = 0,
	qw = 0,
	pl_pos = 0,
	s = 0,
	ggg = 0,
	dir3 = 0,
	steps3 = 0,
	rel_score = 0.0,
	max_rel_score = 0.0,
	scores_count = 0,
	len = 0,
	prev_dir = 0;
	var len = decisions.length;
	var dec_alt = new Array(len);
	for (i = 0; i < len; i++)
		dec_alt[i] = decisions[i];
	var paths = [new Path(e, decisions.length - 1, len, null, dec_alt)];
	paths.push(new Path(e2, dec2.length - 1, dec2.length, null, dec2));
		main_loop: while (new Date() < end_time) {
		longest_path = paths[0];
		max = longest_path.len * longest_path.len / VISITED[longest_path.v_i];
		paths.forEach(p => {
			if (p.len > 3) {
				var cur = (p.len * p.len) / VISITED[p.v_i];
				if (cur > max || longest_path.len < 4) {
					longest_path = p;
					max = cur;
				}
			}
		});
		r_len = longest_path.len >> 2;
		e_alt = new Emulator(longest_path.e);
		for (i = 0; i < r_len; i = i + 1 | 0)
			e_alt.revert_step();
		dec_alt = longest_path.dec.slice(0, longest_path.len - r_len);
		new_path = new Path(e_alt, longest_path.end - r_len, longest_path.len - r_len, longest_path.prev, dec_alt);
		longest_path.prev = paths.length;
		longest_path.dec = longest_path.dec.slice(longest_path.len - r_len);
		longest_path.len = r_len;
		paths.push(new_path);
		e_alt = new Emulator(e_alt);
		prev_dir = longest_path.dec[0];
		decisions_alt = [];
		while (1) {
			max_rel_score = -1.0;
			scores_count = 0;
			e_alt.score = 0;
			set_of_empties_arr[0] = 0;
			set_of_empties_arr[1] = 0;
			set_of_empties_arr[2] = 0;
			set_of_empties_arr[3] = 0;
			set_of_empties_arr[4] = 0;
			set_of_empties_arr[5] = 0;
			set_of_empties_arr[6] = 0;
			set_of_empties_arr[7] = 0;
			set_of_empties_arr[8] = 0;
			set_of_empties_arr[9] = 0;
			set_of_empties_arr[10] = 0;
			set_of_empties_arr[11] = 0;
			set_of_empties_arr[12] = 0;
			set_of_empties_arr[13] = 0;
			set_of_empties_arr[14] = 0;
			set_of_empties_arr[15] = 0;
			set_of_empties_arr[16] = 0;
			set_of_empties_arr[17] = 0;
			set_of_empties_arr[18] = 0;
			set_of_empties_arr[19] = 0;
			set_of_empties_arr[20] = 0;
			set_of_empties_arr[21] = 0;
			set_of_empties_arr[22] = 0;
			set_of_empties_arr[23] = 0;
			for (dir1 = 0; dir1 < 4; dir1 = dir1 + 1 | 0) {
				if (prev_dir === dir1) {
					prev_dir = 4;
					continue;
				}
				steps1 = 0;
				while (1) {
					if (e_alt.streak_ended)
						break;
					qw = e_alt.player_pos + dir1 * 760;
					if ((e_alt.bad_map[qw >> 5] & 1 << (qw & 31)) || e_alt.add_frame(dir1))
						break;
					steps1++;
					if (e_alt.score === 0)
						set_of_empties_arr[e_alt.player_pos >> 5] |= 1 << (e_alt.player_pos & 31);
					for (dir2 = 0; dir2 < 4; dir2 = dir2 + 1 | 0) {
						if (dir2 === dir1)
							continue;
						pl_pos = e_alt.player_pos + apply_dir[dir2];
						if (set_of_empties_arr[pl_pos >> 5] & 1 << (pl_pos & 31))
							continue;
						steps2 = 0;
						while (1) {
							if (e_alt.streak_ended)
								break;
							qw = e_alt.player_pos + dir2 * 760;
							if ((e_alt.bad_map[qw >> 5] & 1 << (qw & 31)) || e_alt.add_frame(dir2))
								break;
							steps2++
							if (e_alt.score === 0) {
								if (set_of_empties_arr[e_alt.player_pos >> 5] & 1 << (e_alt.player_pos & 31))
									continue;
								set_of_empties_arr[e_alt.player_pos >> 5] |= 1 << (e_alt.player_pos & 31);
							}
							len = steps1 + steps2;
							for (dir3 = 0; dir3 < 4; dir3 = dir3 + 1 | 0) {
								if (dir3 === dir2)
									continue;
								steps3 = 0;
								while (1) {
									if (e_alt.streak_ended)
										break;
									qw = e_alt.player_pos + 760 * dir3;
									if ((e_alt.bad_map[qw >> 5] & 1 << (qw & 31)) || e_alt.add_frame(dir3))
										break;
									rel_score = e_alt.score / (len + steps3);
									if (rel_score > max_rel_score) {
										if (!e_alt.add_frame(4)) {
											e_alt.revert_step();
											scores_count++;
											max_rel_score = rel_score;
											b_path = [steps1, dir1, steps2, dir2, steps3 + 1, dir3];
										}
									}
									steps3 = steps3 + 1 | 0;
								}
								while ((steps3--) !== 0)
									e_alt.revert_step();
							}
						}
						while ((steps2--) !== 0)
							e_alt.revert_step();
					}
				}
				while ((steps1--) !== 0)
					e_alt.revert_step();
			}
			if (scores_count === 0) {
				if (e_alt.add_frame(4))
				{
					paths.push(new Path(e_alt, new_path.end + decisions_alt.length, decisions_alt.length, paths.length - 1, decisions_alt));
					break;
				}

				decisions_alt.push(4);
				if (e_alt.streak_ended) {
					paths.push(new Path(e_alt, new_path.end + decisions_alt.length, decisions_alt.length, paths.length - 1, decisions_alt));
					break;

				}
				continue;
			}
			ggg = b_path[0] + b_path[2] > 2 ? 1 : 3;
			for (s = 0; s < ggg; s = s + 1 | 0) {
				steps1 = b_path[s << 1];
				dir1 = b_path[(s << 1) + 1];
				for (i = 0; i < steps1; i++) {
					e_alt.add_frame(dir1);
					decisions_alt.push(dir1);
					if (e_alt.streak_ended) {
						paths.push(new Path(e_alt, new_path.end + decisions_alt.length, decisions_alt.length, paths.length - 1, decisions_alt));
						continue main_loop;
					}
				}
			}
		}
	}
	var best_path = paths[0];
	paths.forEach(p => {
		if (best_path.e.jscore < p.e.jscore)
			best_path = p;
	});
	e = best_path.e;
	while (best_path) {
		for (i = 0; i < best_path.len; i = i + 1 | 0)
			decisions[best_path.end - best_path.len + i + 1] = best_path.dec[i];
		best_path = (best_path.prev !== null) && paths[best_path.prev];
	}
	return e;
}
function generate_last_path(e, decisions) {
	var set_of_empties_arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	var qw = 0,
	dir1 = 0,
	steps1 = 0,
	pl_pos = 0,
	i = 0,
	s = 0,
	dec_len = 0,
	dir2 = 0,
	steps2 = 0,
	dir3 = 0,
	steps3 = 0,
	len = 0,
	max_rel_score = 0.0,
	rel_score = 0.0,
	scores_count = 0,
	ggg = 0,
	prev_dir = 0;
	var b_path;
	while (1) {
		max_rel_score = -1;
		scores_count = 0;
		e.score = 0;
		dec_len = decisions.length;
		if (dec_len + START_STEP > 1200)
			break;
		prev_dir = 4;
		if (decisions[dec_len - 1] !== decisions[dec_len - 2] &&
			decisions[dec_len - 1] === decisions[dec_len - 3] &&
			decisions[dec_len - 1] === decisions[dec_len - 5] &&
			decisions[dec_len - 2] === decisions[dec_len - 4] &&
			decisions[dec_len - 2] === decisions[dec_len - 6]) {
			prev_dir = decisions[dec_len - 2];
		}
		set_of_empties_arr[0] = 0;
		set_of_empties_arr[1] = 0;
		set_of_empties_arr[2] = 0;
		set_of_empties_arr[3] = 0;
		set_of_empties_arr[4] = 0;
		set_of_empties_arr[5] = 0;
		set_of_empties_arr[6] = 0;
		set_of_empties_arr[7] = 0;
		set_of_empties_arr[8] = 0;
		set_of_empties_arr[9] = 0;
		set_of_empties_arr[10] = 0;
		set_of_empties_arr[11] = 0;
		set_of_empties_arr[12] = 0;
		set_of_empties_arr[13] = 0;
		set_of_empties_arr[14] = 0;
		set_of_empties_arr[15] = 0;
		set_of_empties_arr[16] = 0;
		set_of_empties_arr[17] = 0;
		set_of_empties_arr[18] = 0;
		set_of_empties_arr[19] = 0;
		set_of_empties_arr[20] = 0;
		set_of_empties_arr[21] = 0;
		set_of_empties_arr[22] = 0;
		set_of_empties_arr[23] = 0;
		for (dir1 = 0; dir1 < 4; dir1 = dir1 + 1 | 0) {
			if (prev_dir === dir1)
				continue;
			steps1 = 0;
			while (1) {
				qw = e.player_pos + dir1 * 760;
				if ((e.bad_map[qw >> 5] & 1 << (qw & 31)) || e.add_frame(dir1))
					break;
				steps1++;
				if (e.score === 0)
					set_of_empties_arr[e.player_pos >> 5] |= 1 << (e.player_pos & 31);
				for (dir2 = 0; dir2 < 4; dir2 = dir2 + 1 | 0) {
					if (dir2 === dir1)
						continue;
					pl_pos = e.player_pos + apply_dir[dir2];
					if (set_of_empties_arr[pl_pos >> 5] & 1 << (pl_pos & 31))
						continue;
					steps2 = 0;
					while (1) {
						qw = e.player_pos + dir2 * 760;
						if ((e.bad_map[qw >> 5] & 1 << (qw & 31)) || e.add_frame(dir2))
							break;
						steps2++
						if (e.score === 0) {
							if (set_of_empties_arr[e.player_pos >> 5] & 1 << (e.player_pos & 31))
								continue;
							set_of_empties_arr[e.player_pos >> 5] |= 1 << (e.player_pos & 31);
						}
						len = steps1 + steps2 | 0;
						for (dir3 = 0; dir3 < 4; dir3 = dir3 + 1 | 0) {
							if (dir3 === dir2)
								continue;
							steps3 = 0;
							while (1) {
								qw = e.player_pos + 760 * dir3;
								if ((e.bad_map[qw >> 5] & 1 << (qw & 31)) || e.add_frame(dir3))
									break;
								rel_score = e.score / (len + steps3);
								if (rel_score > max_rel_score) {
									if (!e.add_frame(4)) {
										e.revert_step();
										scores_count++;
										max_rel_score = rel_score;
										b_path = [steps1, dir1, steps2, dir2, steps3 + 1, dir3];
									}
								}
								steps3++;
							}
							while ((steps3--) !== 0)
								e.revert_step();
						}
					}
					while ((steps2--) !== 0)
						e.revert_step();
				}
			}
			while ((steps1--) !== 0)
				e.revert_step();
		}
		if (scores_count === 0) {
			decisions.push(4);
			if (e.add_frame(4)) {
				decisions.pop();
				break;
			} else {
				if (e.streak_ended)
					break;
			}
			continue;
		}
		ggg = b_path[0] + b_path[2] > 2 ? 1 : 3;
		for (s = 0; s < ggg; s++) {
			var steps = b_path[s << 1];
			var dir = b_path[(s << 1) + 1];
			for (i = 0; i < steps; i++) {
				e.add_frame(dir);
				decisions.push(dir);
				if (e.streak_ended)
					break;
			}
		}
	}
}
E.play = function  * (screen) {
	var d = new Date();
	var end_time = d.valueOf() + 73000;
	var e = get_e(screen);
	var e2 = new Emulator(e);
	e2.add_frame(4);
	var decisions2 = generate_first_path(e2);
	decisions2.unshift(4);
	var decisions = generate_first_path(e);
	e = build_tree(e, decisions, end_time, e2, decisions2);
	generate_last_path(e, decisions);
	while (1) {
		yield;
		var line = screen[22];
		if (line.startsWith('  0045'))
			break;
	}
	yield;
	for (var i = 0; i < decisions.length; i++)
		yield ch_dirs[decisions[i]];
}