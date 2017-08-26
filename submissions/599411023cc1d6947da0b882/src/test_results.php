#!/usr/bin/env php
<?php

function print_table ( $data, $columns = array() )
{
	// $mask = "|%5.5s |%-30.30s | x |\n";
	if ( !$columns ) {
		foreach ( $data as $row ) {
			$columns = array_merge($columns, array_keys($row));
		}
		$columns = array_unique($columns);
	}
	$mask = array();
	foreach ( $columns as $key ) {
		$l = max(strlen($key), 4);
		if ( $key == 'sec' ) {
			$l = 5;
		} else if ( $key == 'seed' || $key == 'name' ) {
			$l = 9;
		}
		$mask[] = "%{$l}s";
	}
	$mask = "| " . implode(" | ", $mask) . " |\n";
	// header
	$params = array_merge(array($mask), $columns);
	echo ($line = call_user_func_array('sprintf', $params));
	echo str_repeat('-', strlen($line)-1), "\n";
	// body
	foreach ( $data as $row ) {
		$params = array($mask);
		foreach ( $columns as $key ) {
			$params[] = isset($row[$key]) ? $row[$key] : '-';
		}
		echo ($line = call_user_func_array('sprintf', $params));
	}
}


$data = array();
$seeds = array();

foreach ( scandir('tests') as $name ) {
	if ( in_array($name, array(
		'.', '..',
		'result.txt',
		'result.json',
	)) ) {
		continue;
	}
	if ( !preg_match('/^([\w\d-_]+)\.log$/', $name) ) {
		continue;
	}
	
	$f = fopen("tests/$name", 'r');
	
	if ( strrpos($name, '.') > 0 ) {
		$name = substr($name, 0, strrpos($name, '.'));
	}
	
	$data[$name] = array();
	$one_test = false;
	
	while ( $line = fgets($f) ) {
		if ( substr($line, 0, 4) == '----' ) {
			if ( $one_test ) {
				$seed = $one_test['seed'];
				$data[$name][$seed] = $one_test;
				$seeds[] = $seed;
			}
			$one_test = array();
			continue;
		}
		$line = trim($line, " \n\r\t");
		if ( $line == "Game over" ) {
			$one_test['end'] = 'GO';
			continue;
		}
		if ( $line == "Game ended by the player" ) {
			$one_test['end'] = "Q";
			continue;
		}
		
		$list = [
			['/Score\: (\d+)/'						, 'score'],
			['/Diamonds collected\: (\d+)/'			, 'diamonds'],
			['/Butterflies killed\: (\d+)/'			, 'fly'],
			['/Hot streaks\: (\d+)/'				, 'hs'],
			['/Longest streak\: (\d+)/'				, 'ms'],
			['/Duration: (\d+) frames, ([\d\.]+) seconds/', 'frames', 'sec'],
			['/Cave: seed (\d+)/'					, 'seed'],
		];
		
		foreach ( $list as $rule ) {
			$reg_exp = $rule[0];
			if ( preg_match($reg_exp, $line, $matches) ) {
				for ( $i=1; $i<count($rule); $i++ ) {
					$one_test[$rule[$i]] = floatval($matches[$i]);
				}
				break;
			}
		}
	}
}

$total_row = array(
	'score'			=> 0,
	'diamonds'		=> 0,
	'fly'			=> 0,
	'hs'			=> 0,
	'ms'			=> 0,
	'frames'		=> 0,
	'sec'			=> 0,
);
$total_data = array();

$columns = array(
	'seed', 'score', 'diamonds', 'fly', 'hs', 'ms', 'frames', 'sec'
);
foreach ( $data as $name => $result ) {
	echo "  Bot: $name\n\n";
	print_table($result, $columns);
	echo "\n\n";
	
	// calc total
	$total = array_merge(array('name' => $name), $total_row);
	foreach ( $result as $row ) {
		foreach ( $total_row as $attr => $null ) {
			if ( isset($row[$attr]) ) {
				$total[$attr] += $row[$attr];
			}
		}
	}
	$total_data[$name] = $total;
}

$columns[0] = 'name';
echo "  Total\n\n";
print_table($total_data, $columns);



